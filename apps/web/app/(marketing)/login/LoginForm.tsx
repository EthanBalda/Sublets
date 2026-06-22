"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { emailPasswordAuth, type AuthFormState } from "@/lib/auth/actions";

const initialState: AuthFormState = { status: "idle" };

export function LoginForm() {
  const [state, formAction] = useActionState(emailPasswordAuth, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">School email</span>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@ucsd.edu"
          className="h-11 rounded-xl border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          placeholder="At least 6 characters"
          className="h-11 rounded-xl border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)]"
        />
      </label>

      {state.status === "error" && state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
        <SubmitButton mode="signin" label="Log in" primary />
        <SubmitButton mode="signup" label="Sign up" />
      </div>

      <p className="text-xs leading-5 text-[var(--muted)]">
        UCSD students continue to Sublets; other students get a spot on the
        waitlist.
      </p>
    </form>
  );
}

function SubmitButton({
  mode,
  label,
  primary = false,
}: {
  mode: "signin" | "signup";
  label: string;
  primary?: boolean;
}) {
  const { pending } = useFormStatus();
  const base =
    "inline-flex h-12 flex-1 items-center justify-center rounded-full px-5 text-base font-medium disabled:opacity-60";
  const style = primary
    ? "bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
    : "border border-[var(--border)] hover:bg-black/5";
  return (
    <button
      type="submit"
      name="mode"
      value={mode}
      disabled={pending}
      className={`${base} ${style}`}
    >
      {pending ? "…" : label}
    </button>
  );
}
