import Link from "next/link";
import { prisma } from "@/lib/db";
import { listCustomers, listPlans } from "@/server/queries";
import { ButtonLink, EmptyState, PageHeader, Pagination, StatusBadge, TableWrap } from "@/components/ui";
import { CustomerRowActions } from "@/components/row-actions";
import { paginationSchema } from "@/lib/validations";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = paginationSchema.parse({
    q: typeof raw.q === "string" ? raw.q : "",
    status: typeof raw.status === "string" ? raw.status : "",
    planId: typeof raw.planId === "string" ? raw.planId : "",
    page: raw.page ?? 1,
  });
  const [data, plans] = await Promise.all([listCustomers(prisma, parsed), listPlans(prisma)]);
  const href = (page: number) => {
    const params = new URLSearchParams();
    if (parsed.q) params.set("q", parsed.q);
    if (parsed.status) params.set("status", parsed.status);
    if (parsed.planId) params.set("planId", parsed.planId);
    params.set("page", String(page));
    return `/customers?${params.toString()}`;
  };

  return (
    <>
      <PageHeader
        eyebrow="Directory"
        title="Customers"
        description="Search, filter and manage customer accounts, plans and machine assignments."
        actions={<ButtonLink href="/customers/new">Create customer</ButtonLink>}
      />
      <form className="mb-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_160px_180px_auto]" method="get">
        <input
          name="q"
          defaultValue={parsed.q}
          aria-label="Search customers"
          placeholder="Search name, email, phone"
          className="rounded-[var(--radius)] border border-[var(--border)] bg-white px-3 py-2.5"
        />
        <select name="status" defaultValue={parsed.status} aria-label="Status" className="rounded-[var(--radius)] border border-[var(--border)] bg-white px-3 py-2.5">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <select name="planId" defaultValue={parsed.planId} aria-label="Plan" className="rounded-[var(--radius)] border border-[var(--border)] bg-white px-3 py-2.5">
          <option value="">All plans</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
        <button className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold" type="submit">
          Filter
        </button>
      </form>
      {data.rows.length === 0 ? (
        <EmptyState title="No customers yet" body="Create the first customer to begin assignment and subscription tracking." />
      ) : (
        <TableWrap>
          <table className="app-table min-w-[980px]">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Machine</th>
                <th>Subscription</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/customers/${row.id}`} className="font-semibold">
                      {row.name}
                    </Link>
                  </td>
                  <td className="text-[var(--muted)]">{row.email}</td>
                  <td>{row.subscription?.planName ?? "—"}</td>
                  <td className="font-medium">{row.assignedMachines[0] ?? "—"}</td>
                  <td>
                    <StatusBadge value={row.subscription?.status ?? "NONE"} />
                  </td>
                  <td>
                    <StatusBadge value={row.status} />
                  </td>
                  <td className="whitespace-nowrap text-[var(--muted)]">{format(row.createdAt, "dd MMM yyyy")}</td>
                  <td>
                    <CustomerRowActions id={row.id} status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} href={href} />
    </>
  );
}
