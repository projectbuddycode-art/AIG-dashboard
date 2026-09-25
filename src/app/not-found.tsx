import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">AIG Admin</p>
      <h1 className="mt-3 font-[family-name:var(--font-serif)] text-4xl">Page not found</h1>
      <p className="mt-3 max-w-md text-sm text-[var(--text-secondary)]">The record or route you requested does not exist.</p>
      <Link href="/" className="mt-6 font-semibold text-[var(--accent)]">
        Return to dashboard
      </Link>
    </div>
  );
}
