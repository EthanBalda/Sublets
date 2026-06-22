"use client";

export default function SavedError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Saved listings
      </h1>
      <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h2 className="text-base font-semibold text-red-800">
          We couldn&apos;t load your saved listings
        </h2>
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
