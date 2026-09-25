import Link from "next/link";
import { prisma } from "@/lib/db";
import { listMachines } from "@/server/queries";
import { ButtonLink, EmptyState, PageHeader, Pagination, StatusBadge, TableWrap } from "@/components/ui";
import { paginationSchema } from "@/lib/validations";
import { CONNECTIVITY_UNAVAILABLE } from "@/lib/constants";
import { activateMachineAction, suspendMachineAction } from "@/server/actions";
import { asFormAction } from "@/lib/form-action";
import { ConfirmSubmit } from "@/components/forms";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function MachinesPage({
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
  const data = await listMachines(prisma, parsed);
  const href = (page: number) => {
    const params = new URLSearchParams();
    if (parsed.q) params.set("q", parsed.q);
    if (parsed.status) params.set("status", parsed.status);
    params.set("page", String(page));
    return `/machines?${params.toString()}`;
  };

  return (
    <>
      <PageHeader
        eyebrow="Fleet"
        title="Machines"
        description="Machine ID is the permanent business identity of each physical unit. Local ESP32 addresses are never used as IDs."
        actions={<ButtonLink href="/machines/new">Register machine</ButtonLink>}
      />
      <p className="mb-5 text-sm text-[var(--text-secondary)]">
        Account and assignment states come from the database. {CONNECTIVITY_UNAVAILABLE}.
      </p>
      <form className="mb-5 grid min-w-0 gap-3 sm:grid-cols-[1fr_180px_auto]" method="get">
        <input
          name="q"
          defaultValue={parsed.q}
          aria-label="Search machines"
          placeholder="Search Machine ID or customer"
          className="rounded-[var(--radius)] border border-[var(--border)] bg-white px-3 py-2.5"
        />
        <select name="status" defaultValue={parsed.status} aria-label="Assignment status" className="rounded-[var(--radius)] border border-[var(--border)] bg-white px-3 py-2.5">
          <option value="">All account statuses</option>
          <option value="UNASSIGNED">Unassigned</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <button className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold" type="submit">
          Filter
        </button>
      </form>
      {data.rows.length === 0 ? (
        <EmptyState title="No machines registered" body="Register a Machine ID for Box #1. Additional boxes can be added later without schema changes." />
      ) : (
        <TableWrap>
          <table className="app-table min-w-[1080px]">
            <thead>
              <tr>
                <th>Machine ID</th>
                <th>Customer</th>
                <th>Assignment</th>
                <th>Account status</th>
                <th>Firmware</th>
                <th>Last seen</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id}>
                  <td className="font-semibold">{row.machineId}</td>
                  <td>{row.customer?.name ?? "—"}</td>
                  <td>
                    <StatusBadge value={row.customerId ? "Assigned" : "Unassigned"} />
                  </td>
                  <td>
                    <StatusBadge value={row.display.account} />
                  </td>
                  <td>{row.firmwareVersion ?? "Not recorded"}</td>
                  <td className="text-[var(--muted)]">{row.lastSeenAt ? format(row.lastSeenAt, "dd MMM HH:mm") : "No telemetry"}</td>
                  <td className="whitespace-nowrap text-[var(--muted)]">{format(row.createdAt, "dd MMM yyyy")}</td>
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link className="text-xs font-semibold text-[var(--accent)]" href={`/machines/${row.id}`}>
                        View
                      </Link>
                      <form
                        action={asFormAction(
                          row.status === "SUSPENDED"
                            ? activateMachineAction.bind(null, row.id)
                            : suspendMachineAction.bind(null, row.id),
                        )}
                      >
                        <ConfirmSubmit
                          label={row.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                          confirmLabel={row.status === "SUSPENDED" ? "Reactivate this machine?" : "Suspend this machine?"}
                          tone={row.status === "SUSPENDED" ? "neutral" : "danger"}
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
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} href={href} />
    </>
  );
}
