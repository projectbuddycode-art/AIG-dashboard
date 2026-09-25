import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readBearer, verifyCustomerToken } from "@/lib/customer-jwt";
import { expireStaleSubscriptions, getCurrentSubscription } from "@/server/domain";
import { toSubscriptionView } from "@/lib/entitlement";

export async function GET(request: Request) {
  const token = readBearer(request.headers.get("authorization"));
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const payload = await verifyCustomerToken(token);
    await expireStaleSubscriptions(prisma);
    const customer = await prisma.customer.findUnique({
      where: { id: payload.sub },
      include: { machines: true },
    });
    if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const subscription = toSubscriptionView(await getCurrentSubscription(prisma, customer.id));
    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        status: customer.status,
      },
      subscription,
      machines: customer.machines.map((machine) => ({
        machineId: machine.machineId,
        accountStatus: machine.status,
        firmwareVersion: machine.firmwareVersion,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
