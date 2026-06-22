"use client";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        Sublets · admin
      </p>
      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h1 className="text-base font-semibold text-red-800">
          We couldn&apos;t load the moderation dashboard
        </h1>
        <p className="mt-1 text-sm text-red-700">Refresh the page in a moment.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-red-300 px-4 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          Try again
        </button>
      </div>
    </section>
  );
}
