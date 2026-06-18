"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { classifyEmail } from "@/lib/campus";

export type AuthFormState = {
  status: "idle" | "error";
  error?: string;
  mode?: "signin" | "signup";
};

const MIN_PASSWORD_LENGTH = 6;

// Single server action used by both the "Log in" and "Sign up" buttons on
// /login. Each button submits with name="mode" and a different value, so we
// branch on that here.
export async function emailPasswordAuth(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const mode = formData.get("mode") === "signup" ? "signup" : "signin";
  const rawEmail = String(formData.get("email") ?? "");
  const email = rawEmail.trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const kind = classifyEmail(email);

  if (kind === "invalid") {
    return { status: "error", error: "Enter a valid email address.", mode };
  }
  if (kind === "other_edu") {
    redirect(`/waitlist?reason=non-ucsd&email=${encodeURIComponent(email)}`);
  }
  if (kind === "non_edu") {
    redirect(`/waitlist?reason=non-edu&email=${encodeURIComponent(email)}`);
  }

  if (!password) {
    return { status: "error", error: "Enter your password.", mode };
  }
  if (mode === "signup" && password.length < MIN_PASSWORD_LENGTH) {
    return {
      status: "error",
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      mode,
    };
  }

  const supabase = await createSupabaseServerClient();

  if (mode === "signup") {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { status: "error", error: friendlySignUpError(error.message), mode };
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { status: "error", error: friendlySignInError(error.message), mode };
    }
  }

  // Send everyone to /explore; the (app) layout's gate bounces unonboarded
  // users to /onboarding on the next render.
  redirect("/explore");
}

function friendlySignInError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return "Wrong email or password.";
  }
  if (/email not confirmed/i.test(message)) {
    return "This email hasn't been confirmed yet. Disable email confirmations in your Supabase project for local development, or confirm via Supabase Dashboard.";
  }
  return message;
}

function friendlySignUpError(message: string): string {
  if (/already registered/i.test(message) || /user already exists/i.test(message)) {
    return "That email already has an account. Use the Log in button.";
  }
  if (/rate limit/i.test(message)) {
    return "Too many attempts. Try again in a few minutes.";
  }
  return message;
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
