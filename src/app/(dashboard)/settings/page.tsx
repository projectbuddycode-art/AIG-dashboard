import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";
import { CONNECTIVITY_UNAVAILABLE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  const admin = session?.user?.id ? await prisma.admin.findUnique({ where: { id: session.user.id } }) : null;
  const [customers, machines, plans] = await Promise.all([
    prisma.customer.count(),
    prisma.machine.count(),
    prisma.plan.count(),
  ]);

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Settings" description="Administrator profile and application configuration." />
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Admin profile</h2>
          {admin ? <SettingsForm name={admin.name} email={admin.email} role={admin.role} /> : <p>Admin record missing.</p>}
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Security</h2>
          <ul className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
            <li>Admin sessions use Auth.js credentials and expire after 12 hours.</li>
            <li>Customer APIs require a separate signed JWT. Machine ID is not a credential.</li>
            <li>Service secrets are never rendered in this interface.</li>
          </ul>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Application settings</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Product</dt>
              <dd>AIG Admin</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">ESP32 local control</dt>
              <dd>Not used by this dashboard</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Connectivity</dt>
              <dd className="mt-1">{CONNECTIVITY_UNAVAILABLE}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">System information</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Database engine</dt>
              <dd>SQLite via Prisma</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Registered records</dt>
              <dd>
                {customers} customers · {machines} machines · {plans} plans
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Administrator role</dt>
              <dd>{admin?.role ?? "—"}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </>
  );
}
