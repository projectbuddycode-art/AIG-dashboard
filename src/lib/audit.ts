import type { PrismaClient } from "@prisma/client";
import type { AuditEvent } from "@/lib/constants";

export type AuditActor = {
  type: "ADMIN" | "CUSTOMER" | "SYSTEM";
  id?: string | null;
  email?: string | null;
};

type ActivityDb = Pick<PrismaClient, "activityLog">;

export async function recordActivity(
  db: ActivityDb,
  input: {
    event: AuditEvent;
    actor: AuditActor;
    targetType: string;
    targetId: string;
    metadata?: Record<string, unknown>;
  },
) {
  await db.activityLog.create({
    data: {
      event: input.event,
      actorType: input.actor.type,
      actorId: input.actor.id ?? null,
      actorEmail: input.actor.email ?? null,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: JSON.stringify(input.metadata ?? {}),
    },
  });
}
