import Link from "next/link";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Sublets
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/login"
            className="rounded-full px-3 py-1.5 text-[var(--foreground)] hover:bg-black/5"
          >
            Log in
          </Link>
          <Link
            href="/waitlist"
            className="rounded-full bg-[var(--accent)] px-3 py-1.5 font-medium text-[var(--accent-foreground)] hover:opacity-90"
          >
            Join waitlist
          </Link>
        </nav>
      </div>
    </header>
  );
}
