"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomerAction, updateCustomerAction } from "@/server/actions";
import { Card, ErrorText, Field, SelectField, SuccessText } from "@/components/ui";
import { PendingSubmit } from "@/components/forms";

export function CreateCustomerForm({
  plans,
  machines,
}: {
  plans: Array<{ id: string; name: string; durationDays: number }>;
  machines: Array<{ id: string; machineId: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);

  if (plans.length === 0) {
    return (
      <Card>
        <p className="text-sm text-[var(--text-secondary)]">
          Create and activate a plan before adding customers. Customer records require a plan so entitlement is never implied.
        </p>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl">
      <form
        className="grid gap-4"
        action={async (formData) => {
          const result = await createCustomerAction(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setError(null);
          if (result.temporaryPassword) setPassword(result.temporaryPassword);
          else router.push(`/customers/${result.customerId}`);
        }}
      >
        <Field label="Name" name="name" required />
        <Field label="Email" name="email" type="email" required />
        <Field label="Phone" name="phone" required />
        <SelectField label="Plan" name="planId" required>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} · {plan.durationDays} days
            </option>
          ))}
        </SelectField>
        <Field label="Customer app password (optional)" name="password" type="password" placeholder="Leave blank to generate" />
        <SelectField label="Assign available machine (optional)" name="machineDbId">
          <option value="">Do not assign yet</option>
          {machines.map((machine) => (
            <option key={machine.id} value={machine.id}>
              {machine.machineId}
            </option>
          ))}
        </SelectField>
        <ErrorText message={error} />
        {password ? (
          <SuccessText message={`Customer created. Temporary app password: ${password}. Store it securely; it is not shown again.`} />
        ) : null}
        {password ? (
          <button
            type="button"
            className="text-sm font-semibold text-[var(--accent)]"
            onClick={() => router.refresh()}
          >
            Continue to customer list
          </button>
        ) : (
          <PendingSubmit>Create customer</PendingSubmit>
        )}
      </form>
    </Card>
  );
}

export function EditCustomerForm({
  customer,
}: {
  customer: { id: string; name: string; email: string; phone: string };
}) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  return (
    <form
      className="grid gap-3"
      action={async (formData) => {
        const result = await updateCustomerAction(customer.id, formData);
        setOk(Boolean(result.ok));
        setError(result.ok ? null : result.error);
      }}
    >
      <Field label="Name" name="name" required defaultValue={customer.name} />
      <Field label="Email" name="email" type="email" required defaultValue={customer.email} />
      <Field label="Phone" name="phone" required defaultValue={customer.phone} />
      <ErrorText message={error} />
      <SuccessText message={ok ? "Customer updated." : null} />
      <PendingSubmit>Save changes</PendingSubmit>
    </form>
  );
}
