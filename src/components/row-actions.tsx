import Link from "next/link";
import { activateCustomerAction, suspendCustomerAction } from "@/server/actions";
import { asFormAction } from "@/lib/form-action";
import { ConfirmSubmit } from "@/components/forms";

export function CustomerRowActions({ id, status }: { id: string; status: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link className="text-xs font-semibold text-[var(--accent)]" href={`/customers/${id}`}>
        View
      </Link>
      <Link className="text-xs font-semibold text-[var(--accent)]" href={`/customers/${id}#edit`}>
        Edit
      </Link>
      <form
        action={asFormAction(
          status === "ACTIVE" ? suspendCustomerAction.bind(null, id) : activateCustomerAction.bind(null, id),
        )}
      >
        <ConfirmSubmit
          label={status === "ACTIVE" ? "Suspend" : "Reactivate"}
          confirmLabel={
            status === "ACTIVE"
              ? "Suspend this customer and pause active subscriptions?"
              : "Reactivate this customer?"
          }
          tone={status === "ACTIVE" ? "danger" : "neutral"}
        />
      </form>
    </div>
  );
}
