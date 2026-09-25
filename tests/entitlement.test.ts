import { describe, expect, it } from "vitest";
import { generateMachineId, isValidMachineIdFormat, normalizeMachineId } from "@/lib/machine-id";
import { deriveMachineDisplay, effectiveSubscriptionStatus, isSubscriptionEntitled } from "@/lib/entitlement";
import { CONNECTIVITY_UNAVAILABLE } from "@/lib/constants";

describe("machine IDs", () => {
  it("generates AIG-XXXX-XXXX values that are not IP addresses", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateMachineId()));
    expect(ids.size).toBe(50);
    for (const id of ids) {
      expect(isValidMachineIdFormat(id)).toBe(true);
      expect(id.includes("192.168")).toBe(false);
    }
  });

  it("rejects ESP32 local addresses", () => {
    expect(isValidMachineIdFormat("http://192.168.4.1")).toBe(false);
    expect(isValidMachineIdFormat("192.168.4.1")).toBe(false);
    expect(normalizeMachineId("aig-ab23-cd45")).toBe("AIG-AB23-CD45");
  });
});

describe("entitlement", () => {
  it("expires active subscriptions after expiryDate", () => {
    const expiry = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-02T00:00:00Z");
    expect(effectiveSubscriptionStatus("ACTIVE", expiry, now)).toBe("EXPIRED");
    expect(isSubscriptionEntitled("ACTIVE", expiry, now)).toBe(false);
    expect(isSubscriptionEntitled("SUSPENDED", new Date("2027-01-01"), now)).toBe(false);
    expect(isSubscriptionEntitled("CANCELLED", new Date("2027-01-01"), now)).toBe(false);
  });

  it("does not invent ESP32 online status", () => {
    const display = deriveMachineDisplay({
      accountStatus: "ASSIGNED",
      customer: { status: "ACTIVE" },
      subscription: {
        id: "s1",
        status: "ACTIVE",
        storedStatus: "ACTIVE",
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 86400000),
        isEntitled: true,
        planId: "p1",
        planName: "Test",
        features: {
          maxDevices: 1,
          monthlyExportLimit: null,
          unlimitedExports: false,
          maxStorageMb: 1024,
          maxResolution: "standard",
          maxVideoMinutes: 60,
          premiumFeatures: false,
        },
      },
      lastSeenAt: null,
    });
    expect(display.display).toBe("Active");
    expect(display.connectivity).toBe("Unknown");
    expect(display.connectivityNote).toBe(CONNECTIVITY_UNAVAILABLE);
  });
});
