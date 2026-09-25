export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 rounded-md bg-[var(--bg-secondary)]" />
      <div className="h-4 w-80 max-w-full rounded-md bg-[var(--bg-secondary)]" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-28 rounded-[var(--radius)] bg-[var(--bg-secondary)]" />
        ))}
      </div>
    </div>
  );
}
