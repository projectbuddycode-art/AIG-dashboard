import type { PrismaClient } from "@prisma/client";
import { addDays } from "date-fns";
import { hash, compare } from "bcryptjs";
import { AppError } from "@/lib/errors";
import { recordActivity, type AuditActor } from "@/lib/audit";
import { generateMachineId, isValidMachineIdFormat, normalizeMachineId } from "@/lib/machine-id";
import { isSubscriptionEntitled, effectiveSubscriptionStatus } from "@/lib/entitlement";
import { parsePlanFeatures, serializePlanFeatures, type PlanFeatures } from "@/lib/plan-features";

export type Domain = {
  db: PrismaClient;
  actor: AuditActor;
  now?: Date;
};

function nowOf(domain: Domain) {
  return domain.now ?? new Date();
}

async function uniqueMachineId(db: PrismaClient, requested?: string): Promise<string> {
  if (requested) {
    const id = normalizeMachineId(requested);
    if (!isValidMachineIdFormat(id)) {
      throw new AppError("Machine ID must match AIG-XXXX-XXXX and cannot be an IP address.", "INVALID_MACHINE_ID");
    }
    const exists = await db.machine.findUnique({ where: { machineId: id } });
    if (exists) throw new AppError("Machine ID already exists.", "MACHINE_ID_TAKEN");
    return id;
  }

  for (let i = 0; i < 12; i += 1) {
    const id = generateMachineId();
    const exists = await db.machine.findUnique({ where: { machineId: id } });
    if (!exists) return id;
  }
  throw new AppError("Unable to allocate a unique Machine ID.", "MACHINE_ID_ALLOCATION");
}

export async function expireStaleSubscriptions(db: PrismaClient, now = new Date()) {
  await db.subscription.updateMany({
    where: {
      status: "ACTIVE",
      expiryDate: { lte: now },
    },
    data: { status: "EXPIRED" },
  });
}

export async function getCurrentSubscription(db: PrismaClient, customerId: string) {
  return db.subscription.findFirst({
    where: { customerId },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPlan(
  domain: Domain,
  input: { name: string; description: string; durationDays: number; features: PlanFeatures },
) {
  const plan = await domain.db.plan.create({
    data: {
      name: input.name,
      description: input.description,
      durationDays: input.durationDays,
      featuresJson: serializePlanFeatures(input.features),
      status: "ACTIVE",
    },
  });
  await recordActivity(domain.db, {
    event: "PLAN_CREATED",
    actor: domain.actor,
    targetType: "PLAN",
    targetId: plan.id,
    metadata: { name: plan.name, durationDays: plan.durationDays },
  });
  return plan;
}

export async function updatePlan(
  domain: Domain,
  planId: string,
  input: { name: string; description: string; durationDays: number; features: PlanFeatures },
) {
  const existing = await domain.db.plan.findUnique({ where: { id: planId } });
  if (!existing) throw new AppError("Plan not found.", "PLAN_NOT_FOUND", 404);
  const plan = await domain.db.plan.update({
    where: { id: planId },
    data: {
      name: input.name,
      description: input.description,
      durationDays: input.durationDays,
      featuresJson: serializePlanFeatures(input.features),
    },
  });
  await recordActivity(domain.db, {
    event: "PLAN_UPDATED",
    actor: domain.actor,
    targetType: "PLAN",
    targetId: plan.id,
    metadata: { name: plan.name },
  });
  return plan;
}

export async function setPlanStatus(domain: Domain, planId: string, status: "ACTIVE" | "INACTIVE") {
  const plan = await domain.db.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new AppError("Plan not found.", "PLAN_NOT_FOUND", 404);
  return domain.db.plan.update({ where: { id: planId }, data: { status } });
}

export async function createCustomer(
  domain: Domain,
  input: {
    name: string;
    email: string;
    phone: string;
    planId: string;
    password?: string;
    machineDbId?: string;
  },
) {
  const email = input.email.toLowerCase();
  const existing = await domain.db.customer.findUnique({ where: { email } });
  if (existing) throw new AppError("A customer with this email already exists.", "EMAIL_TAKEN");

  const plan = await domain.db.plan.findUnique({ where: { id: input.planId } });
  if (!plan) throw new AppError("Selected plan does not exist.", "PLAN_NOT_FOUND", 404);
  if (plan.status !== "ACTIVE") throw new AppError("Selected plan is not active.", "PLAN_INACTIVE");

  const password = input.password ?? generateTemporaryPassword();
  const passwordHash = await hash(password, 10);
  const now = nowOf(domain);

  const customer = await domain.db.$transaction(async (tx) => {
    const created = await tx.customer.create({
      data: {
        name: input.name,
        email,
        phone: input.phone,
        passwordHash,
        status: "ACTIVE",
      },
    });

    const subscription = await tx.subscription.create({
      data: {
        customerId: created.id,
        planId: plan.id,
        status: "ACTIVE",
        startDate: now,
        expiryDate: addDays(now, plan.durationDays),
      },
    });

    await recordActivity(tx, {
      event: "CUSTOMER_CREATED",
      actor: domain.actor,
      targetType: "CUSTOMER",
      targetId: created.id,
      metadata: { email, name: input.name },
    });
    await recordActivity(tx, {
      event: "SUBSCRIPTION_CREATED",
      actor: domain.actor,
      targetType: "SUBSCRIPTION",
      targetId: subscription.id,
      metadata: { customerId: created.id, planId: plan.id },
    });

    return created;
  });

  if (input.machineDbId) {
    await assignMachine({ ...domain, db: domain.db }, input.machineDbId, customer.id);
  }

  return { customer, temporaryPassword: input.password ? null : password };
}

export async function updateCustomer(
  domain: Domain,
  customerId: string,
  input: { name: string; email: string; phone: string },
) {
  const customer = await domain.db.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError("Customer not found.", "CUSTOMER_NOT_FOUND", 404);
  const email = input.email.toLowerCase();
  if (email !== customer.email) {
    const clash = await domain.db.customer.findUnique({ where: { email } });
    if (clash) throw new AppError("A customer with this email already exists.", "EMAIL_TAKEN");
  }
  const updated = await domain.db.customer.update({
    where: { id: customerId },
    data: { name: input.name, email, phone: input.phone },
  });
  await recordActivity(domain.db, {
    event: "CUSTOMER_UPDATED",
    actor: domain.actor,
    targetType: "CUSTOMER",
    targetId: customerId,
    metadata: { email },
  });
  return updated;
}

export async function suspendCustomer(domain: Domain, customerId: string) {
  const customer = await domain.db.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError("Customer not found.", "CUSTOMER_NOT_FOUND", 404);
  if (customer.status === "SUSPENDED") return customer;

  const updated = await domain.db.$transaction(async (tx) => {
    const next = await tx.customer.update({ where: { id: customerId }, data: { status: "SUSPENDED" } });
    await tx.subscription.updateMany({
      where: { customerId, status: "ACTIVE" },
      data: { status: "SUSPENDED" },
    });
    await recordActivity(tx, {
      event: "CUSTOMER_SUSPENDED",
      actor: domain.actor,
      targetType: "CUSTOMER",
      targetId: customerId,
    });
    return next;
  });
  return updated;
}

export async function activateCustomer(domain: Domain, customerId: string) {
  const customer = await domain.db.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError("Customer not found.", "CUSTOMER_NOT_FOUND", 404);
  const now = nowOf(domain);

  const updated = await domain.db.$transaction(async (tx) => {
    const next = await tx.customer.update({ where: { id: customerId }, data: { status: "ACTIVE" } });
    const latest = await tx.subscription.findFirst({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });
    if (latest && latest.status === "SUSPENDED") {
      const nextStatus = latest.expiryDate.getTime() <= now.getTime() ? "EXPIRED" : "ACTIVE";
      await tx.subscription.update({ where: { id: latest.id }, data: { status: nextStatus } });
      await recordActivity(tx, {
        event: "SUBSCRIPTION_CHANGED",
        actor: domain.actor,
        targetType: "SUBSCRIPTION",
        targetId: latest.id,
        metadata: { status: nextStatus, reason: "customer_reactivated" },
      });
    }
    await recordActivity(tx, {
      event: "CUSTOMER_ACTIVATED",
      actor: domain.actor,
      targetType: "CUSTOMER",
      targetId: customerId,
    });
    return next;
  });
  return updated;
}

export async function changeCustomerPlan(domain: Domain, customerId: string, planId: string) {
  const customer = await domain.db.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError("Customer not found.", "CUSTOMER_NOT_FOUND", 404);
  const plan = await domain.db.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new AppError("Plan not found.", "PLAN_NOT_FOUND", 404);
  if (plan.status !== "ACTIVE") throw new AppError("Selected plan is not active.", "PLAN_INACTIVE");
  if (customer.status !== "ACTIVE") {
    throw new AppError("A suspended customer cannot receive an active plan change.", "CUSTOMER_SUSPENDED");
  }

  const now = nowOf(domain);
  const created = await domain.db.$transaction(async (tx) => {
    await tx.subscription.updateMany({
      where: { customerId, status: { in: ["ACTIVE", "SUSPENDED"] } },
      data: { status: "CANCELLED" },
    });
    const subscription = await tx.subscription.create({
      data: {
        customerId,
        planId: plan.id,
        status: "ACTIVE",
        startDate: now,
        expiryDate: addDays(now, plan.durationDays),
      },
    });
    await recordActivity(tx, {
      event: "PLAN_CHANGED",
      actor: domain.actor,
      targetType: "CUSTOMER",
      targetId: customerId,
      metadata: { planId: plan.id, subscriptionId: subscription.id },
    });
    await recordActivity(tx, {
      event: "SUBSCRIPTION_CHANGED",
      actor: domain.actor,
      targetType: "SUBSCRIPTION",
      targetId: subscription.id,
      metadata: { planId: plan.id, status: "ACTIVE" },
    });
    return subscription;
  });
  return created;
}

export async function createMachine(domain: Domain, input: { machineId?: string; firmwareVersion?: string }) {
  const machineId = await uniqueMachineId(domain.db, input.machineId);
  const machine = await domain.db.machine.create({
    data: {
      machineId,
      status: "UNASSIGNED",
      firmwareVersion: input.firmwareVersion || null,
    },
  });
  await recordActivity(domain.db, {
    event: "MACHINE_CREATED",
    actor: domain.actor,
    targetType: "MACHINE",
    targetId: machine.id,
    metadata: { machineId },
  });
  return machine;
}

export async function assignMachine(domain: Domain, machineDbId: string, customerId: string) {
  const machine = await domain.db.machine.findUnique({
    where: { id: machineDbId },
    include: { assignments: { where: { status: "ACTIVE" } } },
  });
  if (!machine) throw new AppError("Machine not found.", "MACHINE_NOT_FOUND", 404);
  if (machine.status === "SUSPENDED") {
    throw new AppError("A suspended machine cannot be assigned.", "MACHINE_SUSPENDED");
  }

  const customer = await domain.db.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError("Customer not found.", "CUSTOMER_NOT_FOUND", 404);
  if (customer.status !== "ACTIVE") {
    throw new AppError("A suspended customer cannot receive an active machine assignment.", "CUSTOMER_SUSPENDED");
  }

  if (machine.assignments.some((row) => row.status === "ACTIVE" && row.customerId !== customerId)) {
    throw new AppError("This machine is already assigned to another customer.", "MACHINE_ALREADY_ASSIGNED");
  }
  if (machine.customerId && machine.customerId !== customerId && machine.status === "ASSIGNED") {
    throw new AppError("This machine is already assigned to another customer.", "MACHINE_ALREADY_ASSIGNED");
  }
  if (machine.customerId === customerId && machine.status === "ASSIGNED") {
    return machine;
  }

  const updated = await domain.db.$transaction(async (tx) => {
    if (machine.customerId && machine.customerId !== customerId) {
      await tx.machineAssignment.updateMany({
        where: { machineId: machine.id, status: "ACTIVE" },
        data: { status: "UNASSIGNED", unassignedAt: nowOf(domain) },
      });
    }
    await tx.machineAssignment.create({
      data: {
        machineId: machine.id,
        customerId,
        status: "ACTIVE",
        assignedAt: nowOf(domain),
      },
    });
    const next = await tx.machine.update({
      where: { id: machine.id },
      data: { customerId, status: "ASSIGNED" },
    });
    await recordActivity(tx, {
      event: "MACHINE_ASSIGNED",
      actor: domain.actor,
      targetType: "MACHINE",
      targetId: machine.id,
      metadata: { machineId: machine.machineId, customerId },
    });
    return next;
  });
  return updated;
}

export async function unassignMachine(domain: Domain, machineDbId: string) {
  const machine = await domain.db.machine.findUnique({ where: { id: machineDbId } });
  if (!machine) throw new AppError("Machine not found.", "MACHINE_NOT_FOUND", 404);

  const updated = await domain.db.$transaction(async (tx) => {
    await tx.machineAssignment.updateMany({
      where: { machineId: machine.id, status: "ACTIVE" },
      data: { status: "UNASSIGNED", unassignedAt: nowOf(domain) },
    });
    const next = await tx.machine.update({
      where: { id: machine.id },
      data: { customerId: null, status: machine.status === "SUSPENDED" ? "SUSPENDED" : "UNASSIGNED" },
    });
    await recordActivity(tx, {
      event: "MACHINE_UNASSIGNED",
      actor: domain.actor,
      targetType: "MACHINE",
      targetId: machine.id,
      metadata: { machineId: machine.machineId, previousCustomerId: machine.customerId },
    });
    return next;
  });
  return updated;
}

export async function reassignMachine(domain: Domain, machineDbId: string, customerId: string) {
  await unassignMachine(domain, machineDbId);
  return assignMachine(domain, machineDbId, customerId);
}

export async function suspendMachine(domain: Domain, machineDbId: string) {
  const machine = await domain.db.machine.findUnique({ where: { id: machineDbId } });
  if (!machine) throw new AppError("Machine not found.", "MACHINE_NOT_FOUND", 404);
  const updated = await domain.db.machine.update({
    where: { id: machineDbId },
    data: { status: "SUSPENDED" },
  });
  await recordActivity(domain.db, {
    event: "MACHINE_SUSPENDED",
    actor: domain.actor,
    targetType: "MACHINE",
    targetId: machine.id,
    metadata: { machineId: machine.machineId },
  });
  return updated;
}

export async function activateMachine(domain: Domain, machineDbId: string) {
  const machine = await domain.db.machine.findUnique({ where: { id: machineDbId } });
  if (!machine) throw new AppError("Machine not found.", "MACHINE_NOT_FOUND", 404);
  const nextStatus = machine.customerId ? "ASSIGNED" : "UNASSIGNED";
  const updated = await domain.db.machine.update({
    where: { id: machineDbId },
    data: { status: nextStatus },
  });
  await recordActivity(domain.db, {
    event: "MACHINE_ACTIVATED",
    actor: domain.actor,
    targetType: "MACHINE",
    targetId: machine.id,
    metadata: { machineId: machine.machineId, status: nextStatus },
  });
  return updated;
}

export function generateTemporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "Aig-";
  for (let i = 0; i < 10; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export async function authenticateCustomer(db: PrismaClient, email: string, password: string) {
  await expireStaleSubscriptions(db);
  const customer = await db.customer.findUnique({ where: { email: email.toLowerCase() } });
  if (!customer) throw new AppError("Invalid credentials.", "INVALID_CREDENTIALS", 401);
  const ok = await compare(password, customer.passwordHash);
  if (!ok) throw new AppError("Invalid credentials.", "INVALID_CREDENTIALS", 401);
  if (customer.status !== "ACTIVE") {
    throw new AppError("This customer account is suspended.", "CUSTOMER_SUSPENDED", 403);
  }
  return customer;
}

export async function authorizeMachinePairing(
  db: PrismaClient,
  authenticatedCustomerId: string,
  requestedMachineId: string,
) {
  await expireStaleSubscriptions(db);
  const customer = await db.customer.findUnique({ where: { id: authenticatedCustomerId } });
  if (!customer) throw new AppError("Customer not found.", "CUSTOMER_NOT_FOUND", 404);
  if (customer.status !== "ACTIVE") {
    throw new AppError("Customer account is not active.", "CUSTOMER_SUSPENDED", 403);
  }

  const subscription = await getCurrentSubscription(db, customer.id);
  if (!subscription || !isSubscriptionEntitled(subscription.status, subscription.expiryDate)) {
    throw new AppError("No active subscription entitlement.", "SUBSCRIPTION_INACTIVE", 403);
  }

  const machineId = normalizeMachineId(requestedMachineId);
  const machine = await db.machine.findUnique({ where: { machineId } });
  if (!machine) throw new AppError("Machine not found.", "MACHINE_NOT_FOUND", 404);
  if (machine.status === "SUSPENDED") {
    throw new AppError("Machine is suspended.", "MACHINE_SUSPENDED", 403);
  }
  if (machine.customerId !== customer.id || machine.status !== "ASSIGNED") {
    throw new AppError("This machine is not assigned to the authenticated customer.", "MACHINE_NOT_ASSIGNED", 403);
  }

  return {
    customer: { id: customer.id, email: customer.email, name: customer.name, status: customer.status },
    machine: {
      id: machine.id,
      machineId: machine.machineId,
      status: machine.status,
      firmwareVersion: machine.firmwareVersion,
    },
    subscription: {
      id: subscription.id,
      status: effectiveSubscriptionStatus(subscription.status, subscription.expiryDate),
      planId: subscription.planId,
      planName: subscription.plan.name,
      startDate: subscription.startDate,
      expiryDate: subscription.expiryDate,
      features: parsePlanFeatures(subscription.plan.featuresJson),
    },
  };
}

export { isValidMachineIdFormat, parsePlanFeatures };
