import { prisma } from "@/lib/db";
import { listActivity } from "@/server/queries";
import { EmptyState, PageHeader, Pagination, StatusBadge, TableWrap } from "@/components/ui";
import { paginationSchema } from "@/lib/validations";
import { AUDIT_EVENTS } from "@/lib/constants";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = paginationSchema.parse({
    q: typeof raw.q === "string" ? raw.q : "",
    event: typeof raw.event === "string" ? raw.event : "",
    actor: typeof raw.actor === "string" ? raw.actor : "",
    from: typeof raw.from === "string" ? raw.from : "",
    to: typeof raw.to === "string" ? raw.to : "",
    page: raw.page ?? 1,
  });
  const data = await listActivity(prisma, parsed);
  const href = (page: number) => {
    const params = new URLSearchParams();
    if (parsed.q) params.set("q", parsed.q);
    if (parsed.event) params.set("event", parsed.event);
    if (parsed.actor) params.set("actor", parsed.actor);
    if (parsed.from) params.set("from", parsed.from);
    if (parsed.to) params.set("to", parsed.to);
    params.set("page", String(page));
    return `/activity?${params.toString()}`;
  };

  return (
    <>
      <PageHeader eyebrow="Audit" title="Activity" description="Newest events first. Actor, target and metadata are stored for every administrative change." />
      <form className="mb-5 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-6" method="get">
        <input
          name="q"
          defaultValue={parsed.q}
          aria-label="Search"
          placeholder="Search"
          className="rounded-[var(--radius)] border border-[var(--border)] bg-white px-3 py-2.5 xl:col-span-2"
        />
        <select name="event" defaultValue={parsed.event} aria-label="Event type" className="rounded-[var(--radius)] border border-[var(--border)] bg-white px-3 py-2.5">
          <option value="">All events</option>
          {AUDIT_EVENTS.map((event) => (
            <option key={event} value={event}>
              {event.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <input
          name="actor"
          defaultValue={parsed.actor}
          aria-label="Actor"
          placeholder="Actor email"
          className="rounded-[var(--radius)] border border-[var(--border)] bg-white px-3 py-2.5"
        />
        <input name="from" type="date" defaultValue={parsed.from} aria-label="From date" className="rounded-[var(--radius)] border border-[var(--border)] bg-white px-3 py-2.5" />
        <input name="to" type="date" defaultValue={parsed.to} aria-label="To date" className="rounded-[var(--radius)] border border-[var(--border)] bg-white px-3 py-2.5" />
        <button className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold xl:col-span-6" type="submit">
          Apply filters
        </button>
      </form>
      {data.rows.length === 0 ? (
        <EmptyState title="No activity" body="Audit events are recorded when administrators change customers, machines, plans or subscriptions." />
      ) : (
        <TableWrap>
          <table className="app-table min-w-[960px]">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event</th>
                <th>Actor</th>
                <th>Target</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap text-[var(--muted)]">{format(row.createdAt, "dd MMM yyyy HH:mm")}</td>
                  <td className="font-medium">{row.event.replaceAll("_", " ")}</td>
                  <td>
                    <StatusBadge value={row.actorType} />
                    <div className="mt-1 text-[var(--muted)]">{row.actorEmail ?? row.actorId ?? "system"}</div>
                  </td>
                  <td>
                    {row.targetType}
                    <div className="max-w-[12rem] truncate text-[var(--muted)]">{row.targetId}</div>
                  </td>
                  <td className="max-w-[16rem] truncate text-xs text-[var(--muted)]">{row.metadata}</td>
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
