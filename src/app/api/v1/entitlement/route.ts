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
    const entitled =
      customer.status === "ACTIVE" && Boolean(subscription?.isEntitled) && customer.machines.some((m) => m.status === "ASSIGNED");

    return NextResponse.json({
      entitled,
      customerStatus: customer.status,
      subscription: subscription
        ? {
            status: subscription.status,
            planName: subscription.planName,
            expiryDate: subscription.expiryDate,
            features: subscription.features,
          }
        : null,
      assignedMachineIds: customer.machines.filter((m) => m.status === "ASSIGNED").map((m) => m.machineId),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
