import Link from "next/link";
import { clsx } from "clsx";

export function cx(...parts: Array<string | false | null | undefined>) {
  return clsx(parts);
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">{eyebrow}</p>
        ) : null}
        <h1 className="font-[family-name:var(--font-serif)] text-[2rem] leading-tight tracking-tight text-[var(--text)] sm:text-[2.35rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={cx(
        "min-w-0 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_8px_24px_rgba(33,31,26,0.035)] sm:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const styles = {
    primary: "bg-[var(--accent)] text-[#fbf7ee] hover:bg-[var(--accent-soft)]",
    secondary: "border border-[var(--border)] bg-white text-[var(--text)] hover:bg-[var(--bg)]",
    ghost: "text-[var(--accent)] hover:underline",
  } as const;
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center justify-center rounded-md px-3.5 py-2 text-sm font-semibold transition-colors",
        styles[variant],
      )}
    >
      {children}
    </Link>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const normalized = value.replaceAll("_", " ");
  const key = value.toUpperCase();
  const tone =
    key === "ACTIVE" || key === "ASSIGNED"
      ? "bg-[#e7f4ec] text-[#215c38]"
      : key === "SUSPENDED" || key === "EXPIRED" || key === "CANCELLED" || key === "INACTIVE"
        ? "bg-[#f6e7e9] text-[#8a1f2b]"
        : key === "UNASSIGNED" || key === "UNKNOWN" || key === "NONE"
          ? "bg-[#f1ece3] text-[var(--muted)]"
          : "bg-[var(--accent-light)] text-[var(--accent)]";
  return (
    <span className={cx("inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", tone)}>
      {normalized}
    </span>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--bg)] px-5 py-8 text-center">
      <p className="font-semibold text-[var(--text)]">{title}</p>
      <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}

export function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="block min-w-0 text-sm">
      <span className="mb-1.5 block font-medium text-[var(--text-secondary)]">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-white px-3 py-2.5 text-[var(--text)] outline-none"
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  required,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0 text-sm">
      <span className="mb-1.5 block font-medium text-[var(--text-secondary)]">{label}</span>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-white px-3 py-2.5 text-[var(--text)]"
      >
        {children}
      </select>
    </label>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="inline-flex rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#fbf7ee]"
    >
      {children}
    </button>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="rounded-[var(--radius)] bg-[#f6e7e9] px-3 py-2 text-sm text-[#8a1f2b]">{message}</p>;
}

export function SuccessText({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="rounded-[var(--radius)] bg-[#e7f4ec] px-3 py-2 text-sm text-[#215c38]">{message}</p>;
}

export function Pagination({
  page,
  pageSize,
  total,
  href,
}: {
  page: number;
  pageSize: number;
  total: number;
  href: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--text-secondary)]">
      <span>
        {total} record{total === 1 ? "" : "s"} · page {page} of {pages}
      </span>
      <div className="flex gap-3">
        {page > 1 ? (
          <Link className="font-semibold text-[var(--accent)]" href={href(page - 1)}>
            Previous
          </Link>
        ) : (
          <span className="opacity-40">Previous</span>
        )}
        {page < pages ? (
          <Link className="font-semibold text-[var(--accent)]" href={href(page + 1)}>
            Next
          </Link>
        ) : (
          <span className="opacity-40">Next</span>
        )}
      </div>
    </div>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-full min-w-0 overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-white px-4">
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <Card className="h-full">
      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-serif)] text-3xl leading-none tabular-nums sm:text-[2rem]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{description}</p>
    </Card>
  );
}

export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-[var(--text)]">{title}</h2>
      {action}
    </div>
  );
}
