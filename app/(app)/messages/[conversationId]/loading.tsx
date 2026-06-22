export default function ConversationLoading() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col px-4 py-6 sm:py-10">
      <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
      <div className="mt-1 h-5 w-48 animate-pulse rounded bg-zinc-100" />

      <div className="mt-6 flex flex-1 flex-col gap-3">
        <BubbleSkeleton align="left" wide />
        <BubbleSkeleton align="right" />
        <BubbleSkeleton align="left" />
        <BubbleSkeleton align="right" wide />
        <BubbleSkeleton align="left" />
      </div>

      <div className="mt-6 h-16 animate-pulse rounded-2xl border border-[var(--border)] bg-zinc-50" />
    </section>
  );
}

function BubbleSkeleton({
  align,
  wide,
}: {
  align: "left" | "right";
  wide?: boolean;
}) {
  return (
    <div
      className={`flex ${align === "right" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`animate-pulse rounded-2xl bg-zinc-100 px-4 py-3 ${wide ? "w-56" : "w-40"}`}
      >
        <div className="h-3 rounded bg-zinc-200" />
        <div className="mt-1.5 h-3 w-2/3 rounded bg-zinc-200" />
      </div>
    </div>
  );
}
