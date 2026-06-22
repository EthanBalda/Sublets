import Link from "next/link";

export default function ListingNotFound() {
  return (
    <section className="mx-auto w-full max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Listing not found</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        This sublet may have been removed, paused, or never existed. If you
        think this is wrong, ask the person who shared the link.
      </p>
      <Link
        href="/explore"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-5 text-sm font-medium hover:bg-black/5"
      >
        Back to Explore
      </Link>
    </section>
  );
}
