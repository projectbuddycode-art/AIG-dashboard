import Link from "next/link";
import { prisma } from "@/lib/db";
import { listSubscriptions } from "@/server/queries";
import { EmptyState, PageHeader, Pagination, StatusBadge, TableWrap } from "@/components/ui";
import { paginationSchema } from "@/lib/validations";
import { differenceInCalendarDays, format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = paginationSchema.parse({
    q: typeof raw.q === "string" ? raw.q : "",
    status: typeof raw.status === "string" ? raw.status : "",
    page: raw.page ?? 1,
  });
  const data = await listSubscriptions(prisma, parsed);
  const href = (page: number) => {
    const params = new URLSearchParams();
    if (parsed.q) params.set("q", parsed.q);
    if (parsed.status) params.set("status", parsed.status);
    params.set("page", String(page));
    return `/subscriptions?${params.toString()}`;
  };

  return (
    <>
      <PageHeader
        eyebrow="Entitlements"
        title="Subscriptions"
        description="Expiry is evaluated server-side. Expired or cancelled records are never treated as active entitlement."
      />
      <form className="mb-5 grid min-w-0 gap-3 sm:grid-cols-[1fr_180px_auto]" method="get">
        <input
          name="q"
          defaultValue={parsed.q}
          aria-label="Search subscriptions"
          placeholder="Search customer or plan"
          className="rounded-[var(--radius)] border border-[var(--border)] bg-white px-3 py-2.5"
        />
        <select name="status" defaultValue={parsed.status} aria-label="Status" className="rounded-[var(--radius)] border border-[var(--border)] bg-white px-3 py-2.5">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold" type="submit">
          Filter
        </button>
      </form>
      {data.rows.length === 0 ? (
        <EmptyState title="No subscriptions found" body="Subscriptions are created when a customer is assigned a plan." />
      ) : (
        <TableWrap>
          <table className="app-table min-w-[920px]">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan</th>
                <th>Start</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => {
                const days = differenceInCalendarDays(row.expiryDate, new Date());
                const expiryNote =
                  row.status === "ACTIVE" && days >= 0 ? `${days} day${days === 1 ? "" : "s"} remaining` : row.status === "EXPIRED" ? "Expired" : null;
                return (
                  <tr key={row.id}>
                    <td>
                      <div className="font-semibold">{row.customer.name}</div>
                      <div className="text-[var(--muted)]">{row.customer.email}</div>
                    </td>
                    <td>{row.plan.name}</td>
                    <td className="whitespace-nowrap">{format(row.startDate, "dd MMM yyyy")}</td>
                    <td className="whitespace-nowrap">
                      <div>{format(row.expiryDate, "dd MMM yyyy")}</div>
                      {expiryNote ? <div className="text-xs text-[var(--muted)]">{expiryNote}</div> : null}
                    </td>
                    <td>
                      <StatusBadge value={row.status} />
                    </td>
                    <td>
                      <Link className="text-xs font-semibold text-[var(--accent)]" href={`/customers/${row.customerId}`}>
                        View customer
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} href={href} />
    </>
  );
}
