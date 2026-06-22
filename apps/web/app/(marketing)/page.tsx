import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4">
      <section className="flex flex-col items-start gap-6 pt-12 pb-16 sm:pt-20 sm:pb-24">
        <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
          UCSD beta · invite by .edu email
        </span>
        <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Verified student sublets,
          <br />
          campus by campus.
        </h1>
        <p className="max-w-xl text-lg leading-8 text-[var(--muted)]">
          Sublets helps college students find and list short-term rentals from
          other students they can actually trust. Built mobile-first. Starting
          at UC San Diego.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/waitlist"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--accent)] px-6 text-base font-medium text-[var(--accent-foreground)] hover:opacity-90"
          >
            Join the UCSD waitlist
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--border)] px-6 text-base font-medium hover:bg-black/5"
          >
            I have an invite
          </Link>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Free during beta. No payments processed on Sublets.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 border-t border-[var(--border)] py-12 sm:grid-cols-3 sm:py-16">
        <TrustCard
          title=".edu verified"
          body="Listings and messaging are gated to verified .edu email addresses. Strangers stay off the platform."
        />
        <TrustCard
          title="Campus-scoped"
          body="You see sublets from people at your school, not random listings from across the country."
        />
        <TrustCard
          title="Student-built"
          body="Made by students who got tired of scrolling group chats, spreadsheets, and shady DMs to find a summer place."
        />
      </section>

      <section className="flex flex-col items-start gap-4 border-t border-[var(--border)] py-12 sm:py-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Why UCSD first?
        </h2>
        <p className="max-w-2xl text-base leading-7 text-[var(--muted)]">
          We&apos;re launching at UC San Diego before opening to other campuses
          so we can stay close to real students and keep the experience tight.
          If you&apos;re at another school, join the waitlist and we&apos;ll
          tell you when your campus is next.
        </p>
        <Link
          href="/waitlist"
          className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-90"
        >
          Join the waitlist
        </Link>
      </section>

      <section className="border-t border-[var(--border)] py-8 text-xs leading-6 text-[var(--muted)]">
        Sublets helps organize the sublet process between students. We do not
        verify leases, replace landlord approval, or provide legal advice.
      </section>
    </div>
  );
}

function TrustCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-5">
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
    </div>
  );
}
