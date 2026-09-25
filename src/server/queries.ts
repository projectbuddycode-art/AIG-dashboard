import type { Prisma, PrismaClient } from "@prisma/client";
import { deriveMachineDisplay, toSubscriptionView, effectiveSubscriptionStatus } from "@/lib/entitlement";
import { expireStaleSubscriptions, getCurrentSubscription } from "@/server/domain";
import { parsePlanFeatures } from "@/lib/plan-features";

export async function getDashboardMetrics(db: PrismaClient) {
  await expireStaleSubscriptions(db);
  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalCustomers,
    activeCustomers,
    totalMachines,
    assignedMachines,
    unassignedMachines,
    suspendedMachines,
    activeSubscriptions,
    expiringSubscriptions,
    recentActivity,
  ] = await Promise.all([
    db.customer.count(),
    db.customer.count({ where: { status: "ACTIVE" } }),
    db.machine.count(),
    db.machine.count({ where: { status: "ASSIGNED" } }),
    db.machine.count({ where: { status: "UNASSIGNED" } }),
    db.machine.count({ where: { status: "SUSPENDED" } }),
    db.subscription.count({ where: { status: "ACTIVE", expiryDate: { gt: now } } }),
    db.subscription.count({
      where: { status: "ACTIVE", expiryDate: { gt: now, lte: inSevenDays } },
    }),
    db.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return {
    totalCustomers,
    activeCustomers,
    totalMachines,
    activeMachines: assignedMachines,
    unassignedMachines,
    suspendedMachines,
    activeSubscriptions,
    expiringSubscriptions,
    recentActivity,
  };
}

export async function listCustomers(
  db: PrismaClient,
  input: { q: string; status: string; page: number; pageSize: number; planId?: string },
) {
  await expireStaleSubscriptions(db);
  const where: Prisma.CustomerWhereInput = {};
  if (input.status) where.status = input.status;
  if (input.planId) {
    where.subscriptions = { some: { planId: input.planId } };
  }
  if (input.q) {
    where.OR = [
      { name: { contains: input.q } },
      { email: { contains: input.q } },
      { phone: { contains: input.q } },
    ];
  }
  const [total, rows] = await Promise.all([
    db.customer.count({ where }),
    db.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 },
        machines: true,
      },
    }),
  ]);

  return {
    total,
    page: input.page,
    pageSize: input.pageSize,
    rows: rows.map((customer) => {
      const subscription = toSubscriptionView(customer.subscriptions[0] ?? null);
      return {
        ...customer,
        subscription,
        assignedMachineCount: customer.machines.length,
        assignedMachines: customer.machines.map((machine) => machine.machineId),
      };
    }),
  };
}

export async function getCustomerDetail(db: PrismaClient, id: string) {
  await expireStaleSubscriptions(db);
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" } },
      machines: true,
      assignments: { include: { machine: true }, orderBy: { assignedAt: "desc" } },
    },
  });
  if (!customer) return null;

  const current = toSubscriptionView(customer.subscriptions[0] ?? null);
  const activity = await db.activityLog.findMany({
    where: {
      OR: [
        { targetType: "CUSTOMER", targetId: customer.id },
        { targetId: { in: customer.machines.map((m) => m.id) } },
        { targetId: { in: customer.subscriptions.map((s) => s.id) } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return {
    customer,
    currentSubscription: current,
    machines: customer.machines.map((machine) => ({
      machine,
      display: deriveMachineDisplay({
        accountStatus: machine.status,
        customer,
        subscription: current,
        lastSeenAt: machine.lastSeenAt,
      }),
    })),
    assignments: customer.assignments,
    activity,
  };
}

export async function listMachines(
  db: PrismaClient,
  input: { q: string; status: string; page: number; pageSize: number },
) {
  await expireStaleSubscriptions(db);
  const where: Prisma.MachineWhereInput = {};
  if (input.q) {
    where.OR = [{ machineId: { contains: input.q.toUpperCase() } }, { customer: { name: { contains: input.q } } }];
  }
  if (input.status === "UNASSIGNED" || input.status === "ASSIGNED" || input.status === "SUSPENDED") {
    where.status = input.status;
  }

  const [total, rows] = await Promise.all([
    db.machine.count({ where }),
    db.machine.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: { customer: { include: { subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 } } } },
    }),
  ]);

  return {
    total,
    page: input.page,
    pageSize: input.pageSize,
    rows: rows.map((machine) => {
      const subscription = toSubscriptionView(machine.customer?.subscriptions[0] ?? null);
      const display = deriveMachineDisplay({
        accountStatus: machine.status,
        customer: machine.customer,
        subscription,
        lastSeenAt: machine.lastSeenAt,
      });
      return {
        ...machine,
        planName: subscription?.planName ?? null,
        subscriptionStatus: subscription?.status ?? null,
        display,
      };
    }),
  };
}

export async function getMachineDetail(db: PrismaClient, id: string) {
  await expireStaleSubscriptions(db);
  const machine = await db.machine.findUnique({
    where: { id },
    include: {
      customer: { include: { subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 } } },
      assignments: { include: { customer: true }, orderBy: { assignedAt: "desc" } },
    },
  });
  if (!machine) return null;
  const subscription = toSubscriptionView(machine.customer?.subscriptions[0] ?? null);
  const activity = await db.activityLog.findMany({
    where: { targetType: "MACHINE", targetId: machine.id },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return {
    machine,
    subscription,
    display: deriveMachineDisplay({
      accountStatus: machine.status,
      customer: machine.customer,
      subscription,
      lastSeenAt: machine.lastSeenAt,
    }),
    assignments: machine.assignments,
    activity,
  };
}

export async function listPlans(db: PrismaClient) {
  const plans = await db.plan.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { subscriptions: true } } },
  });
  return plans.map((plan) => ({
    ...plan,
    features: parsePlanFeatures(plan.featuresJson),
    subscriberCount: plan._count.subscriptions,
  }));
}

export async function getPlanDetail(db: PrismaClient, id: string) {
  const plan = await db.plan.findUnique({
    where: { id },
    include: {
      subscriptions: {
        include: { customer: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!plan) return null;
  return {
    ...plan,
    features: parsePlanFeatures(plan.featuresJson),
    subscriptions: plan.subscriptions.map((row) => ({
      ...row,
      status: effectiveSubscriptionStatus(row.status, row.expiryDate),
    })),
  };
}

export async function listSubscriptions(
  db: PrismaClient,
  input: { q: string; status: string; page: number; pageSize: number },
) {
  await expireStaleSubscriptions(db);
  const where: Prisma.SubscriptionWhereInput = {};
  if (input.status) where.status = input.status;
  if (input.q) {
    where.OR = [{ customer: { name: { contains: input.q } } }, { customer: { email: { contains: input.q } } }, { plan: { name: { contains: input.q } } }];
  }
  const [total, rows] = await Promise.all([
    db.subscription.count({ where }),
    db.subscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: { customer: true, plan: true },
    }),
  ]);
  return {
    total,
    page: input.page,
    pageSize: input.pageSize,
    rows: rows.map((row) => ({
      ...row,
      status: effectiveSubscriptionStatus(row.status, row.expiryDate),
    })),
  };
}

export async function listActivity(
  db: PrismaClient,
  input: { q: string; page: number; pageSize: number; event?: string; actor?: string; from?: string; to?: string },
) {
  const where: Prisma.ActivityLogWhereInput = {};
  if (input.event) where.event = input.event;
  if (input.actor) where.actorEmail = { contains: input.actor };
  if (input.from || input.to) {
    where.createdAt = {};
    if (input.from) where.createdAt.gte = new Date(input.from);
    if (input.to) {
      const end = new Date(input.to);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }
  if (input.q) {
    where.OR = [
      { event: { contains: input.q.toUpperCase() } },
      { actorEmail: { contains: input.q } },
      { targetType: { contains: input.q.toUpperCase() } },
    ];
  }
  const [total, rows] = await Promise.all([
    db.activityLog.count({ where }),
    db.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ]);
  return { total, page: input.page, pageSize: input.pageSize, rows };
}

export async function listAssignableMachines(db: PrismaClient) {
  return db.machine.findMany({
    where: { status: "UNASSIGNED" },
    orderBy: { createdAt: "desc" },
  });
}

export async function listActivePlans(db: PrismaClient) {
  return db.plan.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } });
}

export { getCurrentSubscription };
