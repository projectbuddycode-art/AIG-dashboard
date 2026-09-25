import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { AuditActor } from "@/lib/audit";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null, actor: null };
  }
  const admin = await prisma.admin.findUnique({ where: { id: session.user.id } });
  if (!admin || admin.status !== "ACTIVE") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null, actor: null };
  }
  const actor: AuditActor = { type: "ADMIN", id: admin.id, email: admin.email };
  return { error: null, session, actor, admin };
}
