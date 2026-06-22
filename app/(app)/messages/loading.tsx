export default function MessagesLoading() {
  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
      <div className="h-8 w-36 animate-pulse rounded-lg bg-zinc-100" />
      <div className="mt-2 h-4 w-72 animate-pulse rounded bg-zinc-100" />
      <ul className="mt-6 flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <ConversationRowSkeleton />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ConversationRowSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-[var(--border)] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="h-4 w-32 rounded bg-zinc-100" />
        <div className="h-3 w-10 rounded bg-zinc-100" />
      </div>
      <div className="mt-2 h-3 w-48 rounded bg-zinc-100" />
      <div className="mt-1.5 h-3 w-64 rounded bg-zinc-100" />
    </div>
  );
}
