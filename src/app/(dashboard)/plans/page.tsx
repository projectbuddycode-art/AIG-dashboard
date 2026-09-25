import Link from "next/link";
import { prisma } from "@/lib/db";
import { listPlans } from "@/server/queries";
import { ButtonLink, EmptyState, PageHeader, StatusBadge, TableWrap } from "@/components/ui";
import { setPlanStatusAction } from "@/server/actions";
import { asFormAction } from "@/lib/form-action";
import { ConfirmSubmit } from "@/components/forms";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const plans = await listPlans(prisma);
  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Plans"
        description="Plan names and durations are configured here. Nothing is hard-coded from the mobile app."
        actions={<ButtonLink href="/plans/new">Create plan</ButtonLink>}
      />
      {plans.length === 0 ? (
        <EmptyState title="No plans" body="Create a plan before adding customers. Duration is stored in days and expiry is calculated on the server." />
      ) : (
        <TableWrap>
          <table className="app-table min-w-[800px]">
            <thead>
              <tr>
                <th>Plan name</th>
                <th>Description</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Customers</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <td>
                    <Link href={`/plans/${plan.id}`} className="font-semibold">
                      {plan.name}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate text-[var(--muted)]">{plan.description || "No description"}</td>
                  <td>{plan.durationDays} days</td>
                  <td>
                    <StatusBadge value={plan.status} />
                  </td>
                  <td>{plan.subscriberCount}</td>
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link className="text-xs font-semibold text-[var(--accent)]" href={`/plans/${plan.id}`}>
                        Edit
                      </Link>
                      <form
                        action={asFormAction(
                          setPlanStatusAction.bind(null, plan.id, plan.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"),
                        )}
                      >
                        <ConfirmSubmit
                          label={plan.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          confirmLabel={plan.status === "ACTIVE" ? "Deactivate this plan for new assignments?" : "Activate this plan?"}
                          tone="neutral"
                        />
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </>
  );
}
