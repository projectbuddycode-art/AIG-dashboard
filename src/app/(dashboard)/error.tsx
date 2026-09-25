"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-6">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl">Something went wrong</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">The page could not be loaded. Your data was not fabricated or overwritten.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#fbf7ee]"
      >
        Try again
      </button>
    </div>
  );
}
