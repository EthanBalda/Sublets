import type { Metadata } from "next";

export const metadata: Metadata = { title: "Account suspended" };

export default function SuspendedPage() {
  return (
    <section className="mx-auto w-full max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Your account is suspended
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Sublets has paused access to your account. If you think this is a
        mistake, reply to the email you used to sign up and we&apos;ll look
        into it.
      </p>
    </section>
  );
}
