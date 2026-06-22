"use client";

import Link from "next/link";

export default function ConversationError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
      <Link
        href="/messages"
        className="text-sm text-[var(--muted)] hover:underline"
      >
        ← Messages
      </Link>
      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h2 className="text-base font-semibold text-red-800">
          We couldn&apos;t load this conversation
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
