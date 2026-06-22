export default function ListingDetailLoading() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="h-48 animate-pulse rounded-2xl bg-zinc-100" />
        <div className="h-48 animate-pulse rounded-2xl bg-zinc-100" />
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <div className="h-8 w-3/4 animate-pulse rounded-lg bg-zinc-100" />
        <div className="h-4 w-40 animate-pulse rounded bg-zinc-100" />
        <div className="mt-1 h-7 w-28 animate-pulse rounded bg-zinc-100" />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-24 animate-pulse rounded-full bg-zinc-100"
          />
        ))}
      </div>

      <hr className="my-8 border-[var(--border)]" />

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-[var(--border)] p-3">
            <div className="h-2.5 w-16 rounded bg-zinc-100" />
            <div className="mt-2 h-4 w-10 rounded bg-zinc-100" />
          </div>
        ))}
      </dl>

      <hr className="my-8 border-[var(--border)]" />

      <div className="h-5 w-24 animate-pulse rounded bg-zinc-100" />
      <div className="mt-3 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-zinc-100" />
        ))}
      </div>

      <hr className="my-8 border-[var(--border)]" />

      <div className="h-5 w-36 animate-pulse rounded bg-zinc-100" />
      <div className="mt-3 flex flex-col gap-2">
        <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-100" />
        <div className="h-4 w-4/6 animate-pulse rounded bg-zinc-100" />
      </div>

      <hr className="my-8 border-[var(--border)]" />

      <div className="h-32 animate-pulse rounded-2xl border border-[var(--border)] bg-zinc-50" />
    </section>
  );
}
