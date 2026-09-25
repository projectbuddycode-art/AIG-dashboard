"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";

export function ConfirmSubmit({
  label,
  confirmLabel,
  tone = "danger",
}: {
  label: string;
  confirmLabel: string;
  tone?: "danger" | "neutral";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { pending } = useFormStatus();
  const buttonClass =
    tone === "danger"
      ? "rounded-md border border-[#d7b0b4] px-2.5 py-1 text-xs font-semibold text-[#8a1f2b]"
      : "rounded-md border border-[var(--border)] px-2.5 py-1 text-xs font-semibold";

  return (
    <>
      <button
        type="button"
        disabled={pending}
        className={buttonClass}
        onClick={() => dialogRef.current?.showModal()}
      >
        {pending ? "Working…" : label}
      </button>
      <dialog
        ref={dialogRef}
        className="w-[min(26rem,calc(100vw-2rem))] rounded-[var(--radius)] border border-[var(--border)] bg-white p-5 text-[var(--text)] shadow-lg"
      >
        <p className="text-sm leading-6">{confirmLabel}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-md px-3 py-1.5 text-sm" onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>
          <button
            type="submit"
            className={
              tone === "danger"
                ? "rounded-md bg-[#9b1c2a] px-3 py-1.5 text-sm font-semibold text-white"
                : "rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#fbf7ee]"
            }
          >
            Confirm
          </button>
        </div>
      </dialog>
    </>
  );
}

export function PendingSubmit({
  children,
  pendingLabel = "Saving…",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#fbf7ee] disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
