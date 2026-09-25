import { PageHeader } from "@/components/ui";
import { PlanForm } from "@/components/plan-form";

export default function NewPlanPage() {
  return (
    <>
      <PageHeader eyebrow="Plans" title="Create plan" description="Configure duration and feature flags. Prices are omitted until billing is integrated." />
      <PlanForm />
    </>
  );
}
