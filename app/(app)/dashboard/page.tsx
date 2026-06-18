import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await requireOnboardedUser();
  const { profile, email } = session;

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        Sublets · account
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        Hi, {profile.full_name.split(" ")[0]}
      </h1>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Signed in as <span className="font-medium">{email}</span> · {session.campus.name}
      </p>

      <dl className="mt-8 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <Field label="Role">{profile.role}</Field>
        <Field label="Major">{profile.major}</Field>
        <Field label="Graduation year">{profile.graduation_year}</Field>
        <Field label="Email verification">{profile.verification_status}</Field>
        <Field label="ID verification">{profile.id_verification_status}</Field>
      </dl>

      <div className="mt-10">
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-5 text-sm font-medium hover:bg-black/5"
          >
            Sign out
          </button>
        </form>
      </div>

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
