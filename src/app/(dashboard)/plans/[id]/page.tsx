import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPlanDetail } from "@/server/queries";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { PlanForm } from "@/components/plan-form";
import { ConfirmSubmit } from "@/components/forms";
import { setPlanStatusAction } from "@/server/actions";
import { asFormAction } from "@/lib/form-action";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await getPlanDetail(prisma, id);
  if (!plan) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Plan"
        title={plan.name}
        description={plan.description || "No description"}
        actions={
          <form action={asFormAction(setPlanStatusAction.bind(null, plan.id, plan.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"))}>
            <ConfirmSubmit
              label={plan.status === "ACTIVE" ? "Deactivate plan" : "Activate plan"}
              confirmLabel={plan.status === "ACTIVE" ? "Deactivate this plan for new assignments?" : "Activate this plan?"}
              tone="neutral"
            />
          </form>
        }
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Configuration</h2>
          <PlanForm
            planId={plan.id}
            defaults={{
              name: plan.name,
              description: plan.description,
              durationDays: plan.durationDays,
              features: plan.features,
            }}
          />
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Subscribers</h2>
          {plan.subscriptions.length === 0 ? (
            <EmptyState title="No subscribers" body="Customers assigned this plan will appear here." />
          ) : (
            <ul className="space-y-3 text-sm">
              {plan.subscriptions.map((row) => (
                <li key={row.id} className="flex justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.customer.name}</p>
                    <p className="text-[var(--muted)]">
                      {format(row.startDate, "dd MMM yyyy")} – {format(row.expiryDate, "dd MMM yyyy")}
                    </p>
                  </div>
                  <StatusBadge value={row.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
