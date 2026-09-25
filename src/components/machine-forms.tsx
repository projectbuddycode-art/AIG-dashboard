"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMachineAction, reassignMachineAction } from "@/server/actions";
import { Card, ErrorText, Field, SuccessText } from "@/components/ui";
import { PendingSubmit } from "@/components/forms";

export function CreateMachineForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <Card className="max-w-xl">
      <form
        className="grid gap-4"
        action={async (formData) => {
          const result = await createMachineAction(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.push(`/machines/${result.id}`);
        }}
      >
        <Field label="Machine ID (optional)" name="machineId" placeholder="Leave blank to generate AIG-XXXX-XXXX" />
        <Field label="Firmware version (optional)" name="firmwareVersion" placeholder="Unknown until reported" />
        <p className="text-sm text-[var(--text-secondary)]">
          Do not enter http://192.168.4.1 or any other local address. That endpoint is used only by the Flutter app on LAN.
        </p>
        <ErrorText message={error} />
        <PendingSubmit>Register machine</PendingSubmit>
      </form>
    </Card>
  );
}

export function AssignMachineForm({
  machineDbId,
  customers,
}: {
  machineDbId: string;
  customers: Array<{ id: string; name: string; email: string }>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  if (customers.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">No active customers available for assignment.</p>;
  }
  return (
    <form
      className="grid gap-3"
      action={async (formData) => {
        formData.set("machineDbId", machineDbId);
        const result = await reassignMachineAction(formData);
        setOk(Boolean(result.ok));
        setError(result.ok ? null : result.error);
      }}
    >
      <label className="block text-sm">
        <span className="mb-1.5 block text-[var(--text-secondary)]">Active customer</span>
        <select name="customerId" required className="w-full rounded-xl border border-[var(--border)] px-3 py-2.5">
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} · {customer.email}
            </option>
          ))}
        </select>
      </label>
      <ErrorText message={error} />
      <SuccessText message={ok ? "Machine assignment updated." : null} />
      <PendingSubmit>Assign to customer</PendingSubmit>
    </form>
  );
}
