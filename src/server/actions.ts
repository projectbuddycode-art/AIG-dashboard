"use server";

import { revalidatePath } from "next/cache";
import { auth, signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAppError } from "@/lib/errors";
import { AuthError } from "next-auth";
import {
  activateCustomer,
  activateMachine,
  assignMachine,
  changeCustomerPlan,
  createCustomer,
  createMachine,
  createPlan,
  reassignMachine,
  setPlanStatus,
  suspendCustomer,
  suspendMachine,
  unassignMachine,
  updateCustomer,
  updatePlan,
} from "@/server/domain";
import {
  assignMachineSchema,
  changePlanSchema,
  createCustomerSchema,
  createMachineSchema,
  createPlanSchema,
  settingsSchema,
  updateCustomerSchema,
  updatePlanSchema,
} from "@/lib/validations";
import { compare, hash } from "bcryptjs";
import { recordActivity } from "@/lib/audit";
import type { AuditActor } from "@/lib/audit";

async function actor(): Promise<AuditActor> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return { type: "ADMIN", id: session.user.id, email: session.user.email };
}

function fail(error: unknown): { ok: false; error: string } {
  if (isAppError(error)) return { ok: false, error: error.message };
  if (error instanceof Error && error.message === "Unauthorized") {
    return { ok: false, error: "You must be signed in as an administrator." };
  }
  console.error(error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function loginAction(_: unknown, formData: FormData) {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
    return { ok: true as const };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false as const, error: "Invalid email or password." };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function createCustomerAction(formData: FormData) {
  try {
    const parsed = createCustomerSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      planId: formData.get("planId"),
      password: formData.get("password") || undefined,
      machineId: formData.get("machineDbId") || undefined,
    });
    const result = await createCustomer(
      { db: prisma, actor: await actor() },
      {
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        planId: parsed.planId,
        password: parsed.password,
        machineDbId: parsed.machineId || undefined,
      },
    );
    revalidatePath("/customers");
    revalidatePath("/");
    return {
      ok: true as const,
      customerId: result.customer.id,
      temporaryPassword: result.temporaryPassword,
    };
  } catch (error) {
    return fail(error);
  }
}

export async function updateCustomerAction(customerId: string, formData: FormData) {
  try {
    const parsed = updateCustomerSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
    });
    await updateCustomer({ db: prisma, actor: await actor() }, customerId, parsed);
    revalidatePath(`/customers/${customerId}`);
    revalidatePath("/customers");
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function suspendCustomerAction(customerId: string) {
  try {
    await suspendCustomer({ db: prisma, actor: await actor() }, customerId);
    revalidatePath(`/customers/${customerId}`);
    revalidatePath("/customers");
    revalidatePath("/machines");
    revalidatePath("/subscriptions");
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function activateCustomerAction(customerId: string) {
  try {
    await activateCustomer({ db: prisma, actor: await actor() }, customerId);
    revalidatePath(`/customers/${customerId}`);
    revalidatePath("/customers");
    revalidatePath("/subscriptions");
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function changePlanAction(formData: FormData) {
  try {
    const parsed = changePlanSchema.parse({
      customerId: formData.get("customerId"),
      planId: formData.get("planId"),
    });
    await changeCustomerPlan({ db: prisma, actor: await actor() }, parsed.customerId, parsed.planId);
    revalidatePath(`/customers/${parsed.customerId}`);
    revalidatePath("/subscriptions");
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function createPlanAction(formData: FormData) {
  try {
    const parsed = createPlanSchema.parse({
      name: formData.get("name"),
      description: formData.get("description") ?? "",
      durationDays: formData.get("durationDays"),
      features: {
        maxDevices: Number(formData.get("maxDevices") || 1),
        monthlyExportLimit: formData.get("monthlyExportLimit")
          ? Number(formData.get("monthlyExportLimit"))
          : null,
        unlimitedExports: formData.get("unlimitedExports") === "on",
        maxStorageMb: Number(formData.get("maxStorageMb") || 1024),
        maxResolution: formData.get("maxResolution") || "standard",
        maxVideoMinutes: Number(formData.get("maxVideoMinutes") || 60),
        premiumFeatures: formData.get("premiumFeatures") === "on",
      },
    });
    const plan = await createPlan({ db: prisma, actor: await actor() }, parsed);
    revalidatePath("/plans");
    return { ok: true as const, planId: plan.id };
  } catch (error) {
    return fail(error);
  }
}

export async function updatePlanAction(planId: string, formData: FormData) {
  try {
    const parsed = updatePlanSchema.parse({
      name: formData.get("name"),
      description: formData.get("description") ?? "",
      durationDays: formData.get("durationDays"),
      features: {
        maxDevices: Number(formData.get("maxDevices") || 1),
        monthlyExportLimit: formData.get("monthlyExportLimit")
          ? Number(formData.get("monthlyExportLimit"))
          : null,
        unlimitedExports: formData.get("unlimitedExports") === "on",
        maxStorageMb: Number(formData.get("maxStorageMb") || 1024),
        maxResolution: formData.get("maxResolution") || "standard",
        maxVideoMinutes: Number(formData.get("maxVideoMinutes") || 60),
        premiumFeatures: formData.get("premiumFeatures") === "on",
      },
    });
    await updatePlan({ db: prisma, actor: await actor() }, planId, parsed);
    revalidatePath(`/plans/${planId}`);
    revalidatePath("/plans");
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function setPlanStatusAction(planId: string, status: "ACTIVE" | "INACTIVE") {
  try {
    await actor();
    await setPlanStatus({ db: prisma, actor: await actor() }, planId, status);
    revalidatePath("/plans");
    revalidatePath(`/plans/${planId}`);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function createMachineAction(formData: FormData) {
  try {
    const parsed = createMachineSchema.parse({
      machineId: formData.get("machineId") || undefined,
      firmwareVersion: formData.get("firmwareVersion") || undefined,
    });
    const machine = await createMachine({ db: prisma, actor: await actor() }, parsed);
    revalidatePath("/machines");
    return { ok: true as const, id: machine.id, machineId: machine.machineId };
  } catch (error) {
    return fail(error);
  }
}

export async function assignMachineAction(formData: FormData) {
  try {
    const parsed = assignMachineSchema.parse({
      machineId: formData.get("machineDbId") ?? formData.get("machineId"),
      customerId: formData.get("customerId"),
    });
    await assignMachine({ db: prisma, actor: await actor() }, parsed.machineId, parsed.customerId);
    revalidatePath("/machines");
    revalidatePath(`/machines/${parsed.machineId}`);
    revalidatePath(`/customers/${parsed.customerId}`);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function unassignMachineAction(machineDbId: string) {
  try {
    await unassignMachine({ db: prisma, actor: await actor() }, machineDbId);
    revalidatePath("/machines");
    revalidatePath(`/machines/${machineDbId}`);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function reassignMachineAction(formData: FormData) {
  try {
    const parsed = assignMachineSchema.parse({
      machineId: formData.get("machineDbId"),
      customerId: formData.get("customerId"),
    });
    await reassignMachine({ db: prisma, actor: await actor() }, parsed.machineId, parsed.customerId);
    revalidatePath("/machines");
    revalidatePath(`/customers/${parsed.customerId}`);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function suspendMachineAction(machineDbId: string) {
  try {
    await suspendMachine({ db: prisma, actor: await actor() }, machineDbId);
    revalidatePath("/machines");
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function activateMachineAction(machineDbId: string) {
  try {
    await activateMachine({ db: prisma, actor: await actor() }, machineDbId);
    revalidatePath("/machines");
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function updateSettingsAction(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { ok: false as const, error: "Unauthorized" };
    const parsed = settingsSchema.parse({
      name: formData.get("name"),
      currentPassword: formData.get("currentPassword") || undefined,
      newPassword: formData.get("newPassword") || undefined,
    });
    const admin = await prisma.admin.findUnique({ where: { id: session.user.id } });
    if (!admin) return { ok: false as const, error: "Admin not found" };

    const data: { name: string; passwordHash?: string } = { name: parsed.name };
    if (parsed.newPassword) {
      if (!parsed.currentPassword) return { ok: false as const, error: "Current password is required." };
      const ok = await compare(parsed.currentPassword, admin.passwordHash);
      if (!ok) return { ok: false as const, error: "Current password is incorrect." };
      data.passwordHash = await hash(parsed.newPassword, 10);
    }
    await prisma.admin.update({ where: { id: admin.id }, data });
    await recordActivity(prisma, {
      event: "ADMIN_UPDATED",
      actor: { type: "ADMIN", id: admin.id, email: admin.email },
      targetType: "ADMIN",
      targetId: admin.id,
    });
    revalidatePath("/settings");
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}
