"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPlanAction, updatePlanAction } from "@/server/actions";
import { Card, ErrorText, Field, SelectField, SuccessText } from "@/components/ui";
import { PendingSubmit } from "@/components/forms";
import type { PlanFeatures } from "@/lib/plan-features";
import { defaultPlanFeatures } from "@/lib/plan-features";

export function PlanForm({
  planId,
  defaults,
}: {
  planId?: string;
  defaults?: { name: string; description: string; durationDays: number; features: PlanFeatures };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const features = defaults?.features ?? defaultPlanFeatures();

  return (
    <Card className={planId ? "" : "max-w-2xl"}>
      <form
        className="grid gap-4"
        action={async (formData) => {
          const result = planId ? await updatePlanAction(planId, formData) : await createPlanAction(formData);
          if (!result.ok) {
            setError(result.error);
            setOk(false);
            return;
          }
          setError(null);
          setOk(true);
          if (!planId && "planId" in result && result.planId) {
            router.push(`/plans/${result.planId}`);
          }
        }}
      >
        <Field label="Name" name="name" required defaultValue={defaults?.name} />
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-[var(--text-secondary)]">Description</span>
          <textarea
            name="description"
            defaultValue={defaults?.description}
            className="min-h-24 w-full rounded-xl border border-[var(--border)] px-3 py-2.5"
          />
        </label>
        <Field label="Duration (days)" name="durationDays" type="number" required defaultValue={String(defaults?.durationDays ?? 30)} />
        <Field label="Max devices" name="maxDevices" type="number" required defaultValue={String(features.maxDevices)} />
        <Field
          label="Monthly export limit (blank = none)"
          name="monthlyExportLimit"
          type="number"
          defaultValue={features.monthlyExportLimit != null ? String(features.monthlyExportLimit) : ""}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="unlimitedExports" defaultChecked={features.unlimitedExports} />
          Unlimited exports
        </label>
        <Field label="Max storage (MB)" name="maxStorageMb" type="number" required defaultValue={String(features.maxStorageMb)} />
        <SelectField label="Max resolution" name="maxResolution" defaultValue={features.maxResolution}>
          <option value="standard">Standard</option>
          <option value="hd">HD</option>
          <option value="ultraHd">Ultra HD</option>
        </SelectField>
        <Field label="Max video minutes" name="maxVideoMinutes" type="number" required defaultValue={String(features.maxVideoMinutes)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="premiumFeatures" defaultChecked={features.premiumFeatures} />
          Premium features
        </label>
        <ErrorText message={error} />
        <SuccessText message={ok ? "Plan saved." : null} />
        <PendingSubmit>{planId ? "Save plan" : "Create plan"}</PendingSubmit>
      </form>
    </Card>
  );
}
