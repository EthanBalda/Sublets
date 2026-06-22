export default function SavedLoading() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
      <div className="h-8 w-44 animate-pulse rounded-lg bg-zinc-100" />
      <div className="mt-2 h-4 w-64 animate-pulse rounded bg-zinc-100" />
      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <CardSkeleton />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
      <div className="h-40 bg-zinc-100" />
      <div className="flex flex-col gap-2 px-4 py-3">
        <div className="h-4 w-16 rounded bg-zinc-100" />
        <div className="h-4 w-3/4 rounded bg-zinc-100" />
        <div className="h-3 w-1/2 rounded bg-zinc-100" />
        <div className="h-3 w-2/3 rounded bg-zinc-100" />
        <div className="mt-1 flex gap-1.5">
          <div className="h-5 w-16 rounded-full bg-zinc-100" />
        </div>
      </div>
    </div>
  );
}
