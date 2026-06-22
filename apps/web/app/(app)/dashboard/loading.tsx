export default function DashboardLoading() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <div className="h-3 w-28 animate-pulse rounded bg-zinc-100" />
      <div className="mt-2 h-8 w-40 animate-pulse rounded-lg bg-zinc-100" />
      <div className="mt-2 h-4 w-56 animate-pulse rounded bg-zinc-100" />

      <div className="mt-8">
        <SectionSkeleton rows={3} />
      </div>
      <div className="mt-8">
        <SectionSkeleton rows={2} />
      </div>
      <div className="mt-8">
        <SectionSkeleton rows={2} />
      </div>
    </section>
  );
}

function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <div>
      <div className="h-5 w-36 animate-pulse rounded bg-zinc-100" />
      <div className="mt-3 flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-2xl border border-[var(--border)] bg-zinc-50"
          />
        ))}
      </div>
    </div>
  );
}
