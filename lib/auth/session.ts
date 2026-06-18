import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import type { Tables } from "@/lib/supabase/types";

export type SessionState = {
  userId: string | null;
  email: string | null;
  profile: Tables<"profiles"> | null;
  campus: Tables<"campuses"> | null;
};

// React.cache de-dupes the auth + db calls within a single render so that
// every component that asks for the session gets the same result without
// re-hitting Supabase.
export const getCurrentSession = cache(async (): Promise<SessionState> => {
  // Treat a missing Supabase config as "no session" so public routes render
  // without env vars. Server actions still throw when called.
  if (!hasSupabaseEnv()) {
    return { userId: null, email: null, profile: null, campus: null };
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, email: null, profile: null, campus: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  let campus: Tables<"campuses"> | null = null;
  if (profile?.campus_id) {
    const { data: campusRow } = await supabase
      .from("campuses")
      .select("*")
      .eq("id", profile.campus_id)
      .maybeSingle();
    campus = campusRow;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile,
    campus,
  };
});

// Authenticated, but profile may not exist yet (mid-onboarding) and may be
// suspended. Use this for /onboarding and /suspended.
export async function requireUser(): Promise<SessionState> {
  const session = await getCurrentSession();
  if (!session.userId) redirect("/login");
  return session;
}

// Fully gated: authenticated, profile created + onboarded, not suspended,
// on a supported campus. Use this for marketplace pages.
export async function requireOnboardedUser(): Promise<
  SessionState & { profile: Tables<"profiles">; campus: Tables<"campuses"> }
> {
  const session = await getCurrentSession();

  if (!session.userId) redirect("/login");
  if (!session.profile) redirect("/onboarding");
  if (session.profile.is_suspended) redirect("/suspended");
  if (!session.profile.is_onboarded) redirect("/onboarding");
  if (!session.campus || !session.campus.is_supported) {
    redirect("/waitlist?reason=non-ucsd");
  }

  return session as SessionState & {
    profile: Tables<"profiles">;
    campus: Tables<"campuses">;
  };
}

export async function requireAdminUser() {
  const session = await requireOnboardedUser();
  if (!session.profile.is_admin) redirect("/dashboard");
  return session;
}
