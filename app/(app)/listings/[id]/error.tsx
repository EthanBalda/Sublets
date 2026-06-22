"use client";

import Link from "next/link";

export default function ListingError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h1 className="text-base font-semibold text-red-800">
          We couldn&apos;t load this listing
        </h1>
        <p className="mt-1 text-sm text-red-700">Refresh the page in a moment.</p>
        <div className="mt-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-full border border-red-300 px-4 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Try again
          </button>
          <Link
            href="/explore"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--border)] px-4 text-sm font-medium hover:bg-black/5"
          >
            Back to Explore
          </Link>
        </div>
      </div>
    </section>
  );
}
