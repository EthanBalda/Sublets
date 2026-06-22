import Link from "next/link";

export default function RequestNotFound() {
  return (
    <section className="mx-auto w-full max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Request not found</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        This interest request either doesn&apos;t exist, was cancelled and
        removed, or belongs to someone else.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-5 text-sm font-medium hover:bg-black/5"
      >
        Back to dashboard
      </Link>
    </section>
  );
}
