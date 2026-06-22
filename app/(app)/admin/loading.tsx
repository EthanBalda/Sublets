export default function AdminLoading() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <div className="h-3 w-28 animate-pulse rounded bg-zinc-100" />
      <div className="mt-2 h-8 w-60 animate-pulse rounded-lg bg-zinc-100" />

      <div className="mt-6 flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-28 animate-pulse rounded-full bg-zinc-100" />
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-[var(--border)] bg-zinc-50"
          />
        ))}
      </div>

      <div className="mt-10 flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-28 animate-pulse rounded-full bg-zinc-100" />
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-2xl border border-[var(--border)] bg-zinc-50"
          />
        ))}
      </div>
    </section>
  );
}
