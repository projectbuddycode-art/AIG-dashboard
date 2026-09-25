import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { AppError } from "@/lib/errors";
import {
  activateCustomer,
  assignMachine,
  authenticateCustomer,
  authorizeMachinePairing,
  changeCustomerPlan,
  createCustomer,
  createMachine,
  createPlan,
  expireStaleSubscriptions,
  suspendCustomer,
  unassignMachine,
} from "@/server/domain";
import { defaultPlanFeatures } from "@/lib/plan-features";

const dbPath = path.join(process.cwd(), "prisma", "test.db");
process.env.DATABASE_URL = `file:${dbPath}`;
process.env.CUSTOMER_JWT_SECRET = "test-customer-secret-32-characters!";
process.env.AUTH_SECRET = "test-auth-secret-32-characters-long";

const prisma = new PrismaClient();
const actor = { type: "ADMIN" as const, id: "admin-test", email: "admin@test.local" };

beforeAll(() => {
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
  });
});

beforeEach(async () => {
  await prisma.activityLog.deleteMany();
  await prisma.machineAssignment.deleteMany();
  await prisma.machine.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.plan.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function seedPlan() {
  return createPlan(
    { db: prisma, actor },
    { name: "Studio", description: "Test plan", durationDays: 30, features: defaultPlanFeatures() },
  );
}

describe("assignment and pairing rules", () => {
  it("prevents a machine from being actively assigned to two customers", async () => {
    const plan = await seedPlan();
    const a = await createCustomer(
      { db: prisma, actor },
      { name: "A", email: "a@test.local", phone: "1111111111", planId: plan.id, password: "password1" },
    );
    const b = await createCustomer(
      { db: prisma, actor },
      { name: "B", email: "b@test.local", phone: "2222222222", planId: plan.id, password: "password1" },
    );
    const machine = await createMachine({ db: prisma, actor }, {});
    await assignMachine({ db: prisma, actor }, machine.id, a.customer.id);
    await expect(assignMachine({ db: prisma, actor }, machine.id, b.customer.id)).rejects.toBeInstanceOf(AppError);
  });

  it("rejects assignment to a suspended customer", async () => {
    const plan = await seedPlan();
    const created = await createCustomer(
      { db: prisma, actor },
      { name: "A", email: "a@test.local", phone: "1111111111", planId: plan.id, password: "password1" },
    );
    await suspendCustomer({ db: prisma, actor }, created.customer.id);
    const machine = await createMachine({ db: prisma, actor }, {});
    await expect(assignMachine({ db: prisma, actor }, machine.id, created.customer.id)).rejects.toMatchObject({
      code: "CUSTOMER_SUSPENDED",
    });
  });

  it("does not treat a cancelled or expired subscription as active entitlement", async () => {
    const plan = await seedPlan();
    const created = await createCustomer(
      { db: prisma, actor },
      { name: "A", email: "a@test.local", phone: "1111111111", planId: plan.id, password: "password1" },
    );
    const machine = await createMachine({ db: prisma, actor }, {});
    await assignMachine({ db: prisma, actor }, machine.id, created.customer.id);

    await prisma.subscription.updateMany({
      where: { customerId: created.customer.id },
      data: { status: "ACTIVE", expiryDate: new Date("2020-01-01") },
    });
    await expireStaleSubscriptions(prisma, new Date("2026-01-01"));

    await expect(
      authorizeMachinePairing(prisma, created.customer.id, machine.machineId),
    ).rejects.toMatchObject({ code: "SUBSCRIPTION_INACTIVE" });
  });

  it("pairs only when the authenticated customer owns the assigned machine", async () => {
    const plan = await seedPlan();
    const a = await createCustomer(
      { db: prisma, actor },
      { name: "A", email: "a@test.local", phone: "1111111111", planId: plan.id, password: "password1" },
    );
    const b = await createCustomer(
      { db: prisma, actor },
      { name: "B", email: "b@test.local", phone: "2222222222", planId: plan.id, password: "password1" },
    );
    const machine = await createMachine({ db: prisma, actor }, {});
    await assignMachine({ db: prisma, actor }, machine.id, a.customer.id);

    const paired = await authorizeMachinePairing(prisma, a.customer.id, machine.machineId);
    expect(paired.machine.machineId).toBe(machine.machineId);

    await expect(authorizeMachinePairing(prisma, b.customer.id, machine.machineId)).rejects.toMatchObject({
      code: "MACHINE_NOT_ASSIGNED",
    });
  });

  it("suspends entitlement with the customer and restores it on reactivation if not expired", async () => {
    const plan = await seedPlan();
    const created = await createCustomer(
      { db: prisma, actor },
      { name: "A", email: "a@test.local", phone: "1111111111", planId: plan.id, password: "password1" },
    );
    const machine = await createMachine({ db: prisma, actor }, {});
    await assignMachine({ db: prisma, actor }, machine.id, created.customer.id);
    await suspendCustomer({ db: prisma, actor }, created.customer.id);
    await expect(authorizeMachinePairing(prisma, created.customer.id, machine.machineId)).rejects.toMatchObject({
      code: "CUSTOMER_SUSPENDED",
    });
    await activateCustomer({ db: prisma, actor }, created.customer.id);
    const paired = await authorizeMachinePairing(prisma, created.customer.id, machine.machineId);
    expect(paired.subscription.status).toBe("ACTIVE");
  });

  it("unassign then reassign updates current owner", async () => {
    const plan = await seedPlan();
    const a = await createCustomer(
      { db: prisma, actor },
      { name: "A", email: "a@test.local", phone: "1111111111", planId: plan.id, password: "password1" },
    );
    const b = await createCustomer(
      { db: prisma, actor },
      { name: "B", email: "b@test.local", phone: "2222222222", planId: plan.id, password: "password1" },
    );
    const machine = await createMachine({ db: prisma, actor }, {});
    await assignMachine({ db: prisma, actor }, machine.id, a.customer.id);
    await unassignMachine({ db: prisma, actor }, machine.id);
    await assignMachine({ db: prisma, actor }, machine.id, b.customer.id);
    const stored = await prisma.machine.findUnique({ where: { id: machine.id } });
    expect(stored?.customerId).toBe(b.customer.id);
    const active = await prisma.machineAssignment.findMany({ where: { machineId: machine.id, status: "ACTIVE" } });
    expect(active).toHaveLength(1);
    expect(active[0].customerId).toBe(b.customer.id);
  });

  it("rejects customer login for a suspended account", async () => {
    const plan = await seedPlan();
    const created = await createCustomer(
      { db: prisma, actor },
      { name: "A", email: "a@test.local", phone: "1111111111", planId: plan.id, password: "password1" },
    );
    await suspendCustomer({ db: prisma, actor }, created.customer.id);
    await expect(authenticateCustomer(prisma, "a@test.local", "password1")).rejects.toMatchObject({
      code: "CUSTOMER_SUSPENDED",
    });
  });

  it("change plan cancels prior subscription rather than stacking active entitlements", async () => {
    const plan = await seedPlan();
    const next = await createPlan(
      { db: prisma, actor },
      { name: "Pro", description: "", durationDays: 90, features: defaultPlanFeatures() },
    );
    const created = await createCustomer(
      { db: prisma, actor },
      { name: "A", email: "a@test.local", phone: "1111111111", planId: plan.id, password: "password1" },
    );
    await changeCustomerPlan({ db: prisma, actor }, created.customer.id, next.id);
    const rows = await prisma.subscription.findMany({ where: { customerId: created.customer.id } });
    expect(rows.filter((row) => row.status === "ACTIVE")).toHaveLength(1);
    expect(rows.filter((row) => row.status === "CANCELLED")).toHaveLength(1);
  });

  it("rejects IP addresses as machine IDs", async () => {
    await expect(createMachine({ db: prisma, actor }, { machineId: "192.168.4.1" })).rejects.toMatchObject({
      code: "INVALID_MACHINE_ID",
    });
  });
});
