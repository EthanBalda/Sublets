export default function AnalyticsLoading() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <div className="h-3 w-40 animate-pulse rounded bg-zinc-100" />
      <div className="mt-2 h-8 w-32 animate-pulse rounded-lg bg-zinc-100" />
      <div className="mt-2 h-4 w-56 animate-pulse rounded bg-zinc-100" />

      <div className="mt-8 flex flex-col gap-10">
        {Array.from({ length: 5 }).map((_, i) => (
          <MetricSectionSkeleton key={i} cols={i === 1 ? 6 : 3} />
        ))}
      </div>
    </section>
  );
}

function MetricSectionSkeleton({ cols }: { cols: number }) {
  return (
    <div>
      <div className="h-5 w-28 animate-pulse rounded bg-zinc-100" />
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: Math.min(cols, 4) }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-[var(--border)] p-3"
          >
            <div className="h-2.5 w-16 rounded bg-zinc-100" />
            <div className="mt-2 h-7 w-12 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
