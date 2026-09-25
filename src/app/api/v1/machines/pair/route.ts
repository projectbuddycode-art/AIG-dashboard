import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readBearer, verifyCustomerToken } from "@/lib/customer-jwt";
import { authorizeMachinePairing } from "@/server/domain";
import { pairMachineSchema } from "@/lib/validations";
import { isAppError } from "@/lib/errors";
import { CONNECTIVITY_UNAVAILABLE } from "@/lib/constants";

export async function POST(request: Request) {
  const token = readBearer(request.headers.get("authorization"));
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const payload = await verifyCustomerToken(token);
    const body = pairMachineSchema.parse(await request.json());
    const result = await authorizeMachinePairing(prisma, payload.sub, body.machineId);
    return NextResponse.json({
      paired: true,
      ...result,
      connectivity: {
        available: false,
        note: CONNECTIVITY_UNAVAILABLE,
        localHardwareNote:
          "ESP32 communication stays on the device LAN. Cloud pairing does not use http://192.168.4.1.",
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message, code: error.code, paired: false }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized", paired: false }, { status: 401 });
  }
}
