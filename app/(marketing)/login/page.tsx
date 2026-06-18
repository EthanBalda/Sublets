import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { getCurrentSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Log in" };

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getCurrentSession();
  if (session.userId) redirect("/explore");

  const { error } = await searchParams;

  return (
    <section className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Log in to Sublets
      </h1>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Open to UC San Diego students during the beta. Other students can join
        the waitlist.
      </p>

      {error === "callback_failed" ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Your previous sign-in attempt failed. Please try again below.
        </p>
      ) : null}

      <div className="mt-6">
        <LoginForm />
      </div>

      <p className="mt-8 text-xs leading-5 text-[var(--muted)]">
        Sublets currently verifies student email only. Government ID
        verification is not active in this MVP.
      </p>
    </section>
  );
}
