"use client";

import { useState } from "react";
import { updateSettingsAction } from "@/server/actions";
import { ErrorText, Field, SuccessText } from "@/components/ui";
import { PendingSubmit } from "@/components/forms";

export function SettingsForm({ name, email, role }: { name: string; email: string; role: string }) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  return (
    <form
      className="grid gap-4"
      action={async (formData) => {
        const result = await updateSettingsAction(formData);
        setOk(Boolean(result.ok));
        setError(result.ok ? null : result.error);
      }}
    >
      <p className="text-sm text-[var(--text-secondary)]">
        {email} · {role}
      </p>
      <Field label="Display name" name="name" required defaultValue={name} />
      <Field label="Current password" name="currentPassword" type="password" />
      <Field label="New password" name="newPassword" type="password" />
      <ErrorText message={error} />
      <SuccessText message={ok ? "Settings saved." : null} />
      <PendingSubmit>Save settings</PendingSubmit>
    </form>
  );
}
