import type { Customer, Subscription } from "@prisma/client";
import type { PlanFeatures } from "@/lib/plan-features";
import { parsePlanFeatures } from "@/lib/plan-features";
import { CONNECTIVITY_UNAVAILABLE } from "@/lib/constants";

export type SubscriptionView = {
  id: string;
  status: string;
  storedStatus: string;
  startDate: Date;
  expiryDate: Date;
  isEntitled: boolean;
  planId: string;
  planName: string;
  features: PlanFeatures;
};

export function effectiveSubscriptionStatus(stored: string, expiryDate: Date, now = new Date()): string {
  if (stored === "CANCELLED" || stored === "SUSPENDED") return stored;
  if (stored === "ACTIVE" && expiryDate.getTime() <= now.getTime()) return "EXPIRED";
  return stored;
}

export function isSubscriptionEntitled(stored: string, expiryDate: Date, now = new Date()): boolean {
  return effectiveSubscriptionStatus(stored, expiryDate, now) === "ACTIVE";
}

export function toSubscriptionView(
  subscription: (Subscription & { plan: { id: string; name: string; featuresJson: string } }) | null,
  now = new Date(),
): SubscriptionView | null {
  if (!subscription) return null;
  const status = effectiveSubscriptionStatus(subscription.status, subscription.expiryDate, now);
  return {
    id: subscription.id,
    status,
    storedStatus: subscription.status,
    startDate: subscription.startDate,
    expiryDate: subscription.expiryDate,
    isEntitled: status === "ACTIVE",
    planId: subscription.plan.id,
    planName: subscription.plan.name,
    features: parsePlanFeatures(subscription.plan.featuresJson),
  };
}

export type MachineDisplayStatus = "Unassigned" | "Assigned" | "Active" | "Suspended" | "Offline" | "Unknown";

export function machineAccountLabel(status: string): MachineDisplayStatus {
  if (status === "SUSPENDED") return "Suspended";
  if (status === "UNASSIGNED") return "Unassigned";
  if (status === "ASSIGNED") return "Assigned";
  return "Unknown";
}

export function deriveMachineDisplay(input: {
  accountStatus: string;
  customer: Pick<Customer, "status"> | null;
  subscription: SubscriptionView | null;
  lastSeenAt: Date | null;
}): {
  account: MachineDisplayStatus;
  entitlement: "Active" | "Inactive";
  connectivity: "Unknown" | "Offline";
  connectivityNote: string;
  display: MachineDisplayStatus;
} {
  const account = machineAccountLabel(input.accountStatus);
  const entitled =
    input.accountStatus === "ASSIGNED" &&
    input.customer?.status === "ACTIVE" &&
    Boolean(input.subscription?.isEntitled);

  let connectivity: "Unknown" | "Offline" = "Unknown";
  let connectivityNote = CONNECTIVITY_UNAVAILABLE;
  if (input.lastSeenAt) {
    const staleMs = Date.now() - input.lastSeenAt.getTime();
    connectivity = staleMs > 15 * 60 * 1000 ? "Offline" : "Unknown";
    connectivityNote = input.lastSeenAt
      ? `Last cloud heartbeat recorded ${input.lastSeenAt.toISOString()}. Real-time ESP32 connectivity is not reported to this dashboard.`
      : CONNECTIVITY_UNAVAILABLE;
  }

  let display: MachineDisplayStatus = account;
  if (account === "Suspended") display = "Suspended";
  else if (account === "Unassigned") display = "Unassigned";
  else if (entitled) display = "Active";
  else display = "Assigned";

  return {
    account,
    entitlement: entitled ? "Active" : "Inactive",
    connectivity,
    connectivityNote,
    display,
  };
}

export function canAssignToCustomer(customer: Pick<Customer, "status">): boolean {
  return customer.status === "ACTIVE";
}
