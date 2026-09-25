import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCustomerDetail, listActivePlans, listAssignableMachines } from "@/server/queries";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { ConfirmSubmit } from "@/components/forms";
import { activateCustomerAction, assignMachineAction, changePlanAction, suspendCustomerAction, unassignMachineAction } from "@/server/actions";
import { asFormAction } from "@/lib/form-action";
import { EditCustomerForm } from "@/components/customer-forms";
import { CONNECTIVITY_UNAVAILABLE } from "@/lib/constants";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getCustomerDetail(prisma, id);
  if (!detail) notFound();
  const [plans, machines] = await Promise.all([listActivePlans(prisma), listAssignableMachines(prisma)]);
  const { customer, currentSubscription } = detail;

  return (
    <>
      <PageHeader
        eyebrow="Customer"
        title={customer.name}
        description={customer.email}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={customer.status} />
            <form action={asFormAction(customer.status === "ACTIVE" ? suspendCustomerAction.bind(null, customer.id) : activateCustomerAction.bind(null, customer.id))}>
            <ConfirmSubmit
              label={customer.status === "ACTIVE" ? "Suspend customer" : "Reactivate customer"}
              confirmLabel={
                customer.status === "ACTIVE"
                  ? "Suspend this customer and pause active subscriptions?"
                  : "Reactivate this customer?"
              }
              tone={customer.status === "ACTIVE" ? "danger" : "neutral"}
            />
          </form>
          </div>
        }
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Customer information</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[var(--muted)]">Phone</dt>
              <dd>{customer.phone}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Status</dt>
              <dd>
                <StatusBadge value={customer.status} />
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Created</dt>
              <dd>{format(customer.createdAt, "dd MMM yyyy HH:mm")}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Updated</dt>
              <dd>{format(customer.updatedAt, "dd MMM yyyy HH:mm")}</dd>
            </div>
          </dl>
          <div id="edit" className="mt-6">
            <h3 className="mb-3 text-sm font-semibold">Edit customer</h3>
            <EditCustomerForm customer={customer} />
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Subscription</h2>
          {currentSubscription ? (
            <div className="space-y-3 text-sm">
              <p className="text-lg font-semibold">{currentSubscription.planName}</p>
              <StatusBadge value={currentSubscription.status} />
              <p>Start {format(currentSubscription.startDate, "dd MMM yyyy")}</p>
              <p>Expiry {format(currentSubscription.expiryDate, "dd MMM yyyy")}</p>
              <p className="text-[var(--muted)]">
                Entitlement is calculated on the server. Inactive subscriptions are not treated as active access.
              </p>
            </div>
          ) : (
            <EmptyState title="No subscription" body="Assign an active plan to create entitlement." />
          )}
          <form action={asFormAction(changePlanAction)} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="customerId" value={customer.id} />
            <select name="planId" className="flex-1 rounded-xl border border-[var(--border)] px-3 py-2" required>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} · {plan.durationDays} days
                </option>
              ))}
            </select>
            <ConfirmSubmit label="Change plan" confirmLabel="Replace the current subscription with this plan?" tone="neutral" />
          </form>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Assigned machine</h2>
          {detail.machines.length === 0 ? (
            <EmptyState title="No machine assigned" body="Assign an available Machine ID. ESP32 IP addresses are not identities." />
          ) : (
            <ul className="space-y-3 text-sm">
              {detail.machines.map(({ machine, display }) => (
                <li key={machine.id} className="rounded-xl border border-[var(--border)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{machine.machineId}</p>
                    <StatusBadge value={display.display} />
                  </div>
                  <p className="mt-2 text-[var(--muted)]">Account: {display.account} · Entitlement: {display.entitlement}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{CONNECTIVITY_UNAVAILABLE}</p>
                  <form action={asFormAction(unassignMachineAction.bind(null, machine.id))} className="mt-3">
                    <ConfirmSubmit label="Unassign" confirmLabel="Unassign this machine from the customer?" tone="neutral" />
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={asFormAction(assignMachineAction)} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="customerId" value={customer.id} />
            <select name="machineDbId" className="flex-1 rounded-xl border border-[var(--border)] px-3 py-2" required>
              <option value="">Select available machine</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.machineId}
                </option>
              ))}
            </select>
            <ConfirmSubmit label="Assign machine" confirmLabel="Assign this machine to the customer?" tone="neutral" />
          </form>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Assignment history</h2>
          {detail.assignments.length === 0 ? (
            <EmptyState title="No assignment history" body="Assignments will appear after a machine is bound." />
          ) : (
            <ul className="space-y-3 text-sm">
              {detail.assignments.map((row) => (
                <li key={row.id} className="flex justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.machine.machineId}</p>
                    <p className="text-[var(--muted)]">
                      {format(row.assignedAt, "dd MMM yyyy")}
                      {row.unassignedAt ? ` – ${format(row.unassignedAt, "dd MMM yyyy")}` : " – current"}
                    </p>
                  </div>
                  <StatusBadge value={row.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-5">
        <h2 className="mb-4 font-semibold">Activity history</h2>
        {detail.activity.length === 0 ? (
          <EmptyState title="No activity" body="Customer events will appear here." />
        ) : (
          <ul className="space-y-3 text-sm">
            {detail.activity.map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-2">
                <span>{item.event.replaceAll("_", " ")}</span>
                <span className="text-[var(--muted)]">{format(item.createdAt, "dd MMM yyyy HH:mm")}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
