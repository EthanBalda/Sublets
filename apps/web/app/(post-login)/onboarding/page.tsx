import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = { title: "Welcome to Sublets" };

export default async function OnboardingPage() {
  const session = await requireUser();

  if (session.profile?.is_suspended) {
    redirect("/suspended");
  }
  if (session.profile?.is_onboarded) {
    redirect("/explore");
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        UCSD beta · onboarding
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        A few things before you browse
      </h1>
      <p className="mt-3 text-base leading-7 text-[var(--muted)]">
        This profile is what other UCSD students see when you message or post a
        sublet. You can edit it later.
      </p>

      <div className="mt-8">
        <OnboardingForm />
      </div>
    </section>
  );
}
