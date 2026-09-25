import { describe, expect, it } from "vitest";
import { signCustomerToken, verifyCustomerToken } from "@/lib/customer-jwt";

process.env.CUSTOMER_JWT_SECRET = "test-customer-secret-32-characters!";

describe("customer JWT", () => {
  it("signs and verifies a customer token", async () => {
    const token = await signCustomerToken({ id: "cust_1", email: "a@test.local" });
    const payload = await verifyCustomerToken(token);
    expect(payload.sub).toBe("cust_1");
    expect(payload.typ).toBe("customer");
  });
});
