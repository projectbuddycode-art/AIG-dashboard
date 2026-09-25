import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateCustomer } from "@/server/domain";
import { signCustomerToken } from "@/lib/customer-jwt";
import { customerLoginSchema } from "@/lib/validations";
import { isAppError } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = customerLoginSchema.parse(body);
    const customer = await authenticateCustomer(prisma, parsed.email, parsed.password);
    const token = await signCustomerToken({ id: customer.id, email: customer.email });
    return NextResponse.json({
      token,
      tokenType: "Bearer",
      expiresIn: 12 * 60 * 60,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        status: customer.status,
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
