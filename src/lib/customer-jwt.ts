import { SignJWT, jwtVerify } from "jose";

export type CustomerToken = {
  sub: string;
  email: string;
  typ: "customer";
};

function secret() {
  const value = process.env.CUSTOMER_JWT_SECRET;
  if (!value) throw new Error("CUSTOMER_JWT_SECRET is not configured");
  return new TextEncoder().encode(value);
}

export async function signCustomerToken(payload: { id: string; email: string }) {
  return new SignJWT({ email: payload.email, typ: "customer" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.id)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function verifyCustomerToken(token: string): Promise<CustomerToken> {
  const { payload } = await jwtVerify(token, secret());
  if (payload.typ !== "customer" || !payload.sub || typeof payload.email !== "string") {
    throw new Error("Invalid customer token");
  }
  return { sub: payload.sub, email: payload.email, typ: "customer" };
}

export function readBearer(header: string | null): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}
