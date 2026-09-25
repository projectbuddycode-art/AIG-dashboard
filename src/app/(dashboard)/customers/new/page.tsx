import { prisma } from "@/lib/db";
import { listActivePlans, listAssignableMachines } from "@/server/queries";
import { CreateCustomerForm } from "@/components/customer-forms";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const [plans, machines] = await Promise.all([listActivePlans(prisma), listAssignableMachines(prisma)]);
  return (
    <>
      <PageHeader
        eyebrow="Customers"
        title="Create customer"
        description="A plan is required. Machine assignment is optional and only lists unassigned machines."
      />
      <CreateCustomerForm plans={plans} machines={machines} />
    </>
  );
}
