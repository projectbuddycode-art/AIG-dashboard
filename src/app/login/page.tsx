"use client";

import { useActionState } from "react";
import { loginAction } from "@/server/actions";
import { ErrorText, Field } from "@/components/ui";
import { PendingSubmit } from "@/components/forms";

export default function LoginPage() {
  const [state, action] = useActionState(loginAction, null);

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden flex-col justify-between bg-[var(--bg-secondary)] px-16 py-14 lg:flex">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
          Accredited Institute of Gemology
        </p>
        <div>
          <h1 className="max-w-md font-[family-name:var(--font-serif)] text-6xl leading-[1.05] text-[var(--text)]">
            Administration for DiamondCam.
          </h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-[var(--text-secondary)]">
            Manage customers, machine identities, plans and entitlements. Local ESP32 control remains on the device
            network and is never treated as a machine identity.
          </p>
        </div>
        <p className="text-xs text-[var(--muted)]">Box inventory is identity-based. IPs are not identifiers.</p>
      </section>
      <section className="flex items-center justify-center px-6 py-16">
        <form action={action} className="w-full max-w-sm space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Sign in</p>
            <h2 className="mt-2 font-[family-name:var(--font-serif)] text-4xl">AIG Admin</h2>
          </div>
          <Field label="Email" name="email" type="email" required />
          <Field label="Password" name="password" type="password" required />
          <ErrorText message={state && "error" in state ? state.error : null} />
          <PendingSubmit pendingLabel="Signing in…">Continue</PendingSubmit>
        </form>
      </section>
    </div>
  );
}
