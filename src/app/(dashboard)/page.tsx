import Link from "next/link";
import { prisma } from "@/lib/db";
import { getDashboardMetrics } from "@/server/queries";
import { ButtonLink, Card, EmptyState, KpiCard, PageHeader, SectionTitle, StatusBadge } from "@/components/ui";
import { CONNECTIVITY_UNAVAILABLE } from "@/lib/constants";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics(prisma);
  const kpis = [
    { label: "Total Customers", value: metrics.totalCustomers, description: "Registered customer accounts" },
    { label: "Active Customers", value: metrics.activeCustomers, description: "Accounts not currently suspended" },
    { label: "Total Machines", value: metrics.totalMachines, description: "Machines registered in the system" },
    { label: "Unassigned Machines", value: metrics.unassignedMachines, description: "Available for customer assignment" },
    { label: "Active Subscriptions", value: metrics.activeSubscriptions, description: "Entitlements currently in force" },
    { label: "Expiring in 7 days", value: metrics.expiringSubscriptions, description: "Active plans approaching expiry" },
  ];

  return (
    <>
      <PageHeader
        title="Operations"
        description="Operational overview of customers, machines and subscriptions."
      />

      <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      <div className="mt-6 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="p-0 sm:p-0">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <SectionTitle title="Recent activity" />
            <ButtonLink href="/activity" variant="ghost">
              View all activity
            </ButtonLink>
          </div>
          {metrics.recentActivity.length === 0 ? (
            <div className="px-4 pb-4">
              <EmptyState title="No recent activity" body="Events appear here when customers, machines, plans or subscriptions change." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="app-table min-w-[640px] px-4">
                <thead>
                  <tr>
                    <th className="pl-4">Event</th>
                    <th>Actor</th>
                    <th>Target</th>
                    <th>Time</th>
                    <th className="pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentActivity.slice(0, 8).map((item) => (
                    <tr key={item.id}>
                      <td className="pl-4 font-medium">{item.event.replaceAll("_", " ")}</td>
                      <td className="text-[var(--text-secondary)]">{item.actorEmail ?? item.actorType}</td>
                      <td>{item.targetType}</td>
                      <td className="whitespace-nowrap text-[var(--muted)]">{format(item.createdAt, "dd MMM HH:mm")}</td>
                      <td className="pr-4">
                        <StatusBadge value={item.actorType} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle title="Machine overview" />
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[var(--muted)]">Total</dt>
              <dd className="text-lg font-semibold">{metrics.totalMachines}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Assigned</dt>
              <dd className="text-lg font-semibold">{metrics.activeMachines}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Unassigned</dt>
              <dd className="text-lg font-semibold">{metrics.unassignedMachines}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Suspended</dt>
              <dd className="text-lg font-semibold">{metrics.suspendedMachines}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-[var(--text-secondary)]">
            Figures are database account states. {CONNECTIVITY_UNAVAILABLE}. Local ESP32 connectivity is handled by the Flutter app on the machine LAN.
          </p>
          <Link href="/machines" className="mt-3 inline-block text-sm font-semibold text-[var(--accent)]">
            Open machines
          </Link>
        </Card>
      </div>
    </>
  );
}
