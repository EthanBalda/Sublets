import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";
import { getOwnListings } from "@/lib/listings/queries";
import {
  getIncomingRequestsForLister,
  getOutgoingRequestsForSeeker,
} from "@/lib/requests/queries";
import { MyListingsSection } from "@/components/listings/MyListingsSection";
import { RequestsSection } from "@/components/requests/RequestsSection";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await requireOnboardedUser();
  const { profile, email } = session;
  const [listings, incoming, outgoing] = await Promise.all([
    getOwnListings(profile.id),
    getIncomingRequestsForLister(profile.id),
    getOutgoingRequestsForSeeker(profile.id),
  ]);

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        Sublets · account
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        Hi, {profile.full_name.split(" ")[0]}
      </h1>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Signed in as <span className="font-medium">{email}</span> · {session.campus.name}
      </p>

      <div className="mt-8">
        <MyListingsSection listings={listings} />
      </div>

      <div className="mt-8">
        <RequestsSection
          title="Incoming requests"
          emptyHint="No one has requested your listings yet."
          requests={incoming}
          side="lister"
        />
      </div>

      <div className="mt-8">
        <RequestsSection
          title="Your requests"
          emptyHint="You haven't requested any listings yet."
          requests={outgoing}
          side="seeker"
        />
      </div>

      <details className="mt-10 rounded-2xl border border-[var(--border)] p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Account details
        </summary>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field label="Role">{profile.role}</Field>
          <Field label="Major">{profile.major}</Field>
          <Field label="Graduation year">{profile.graduation_year}</Field>
          <Field label="Email verification">{profile.verification_status}</Field>
          <Field label="ID verification">{profile.id_verification_status}</Field>
        </dl>
        <div className="mt-6">
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-5 text-sm font-medium hover:bg-black/5"
            >
              Sign out
            </button>
          </form>
        </div>
      </details>

      <p className="mt-10 text-xs leading-5 text-[var(--muted)]">
        Sublets currently verifies student email only. Government ID
        verification is not active in this MVP.
      </p>
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
        Sublets helps organize the sublet process. It does not provide legal
        advice, process payments, or replace landlord approval.
      </p>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <dt className="text-xs uppercase tracking-wider text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}
