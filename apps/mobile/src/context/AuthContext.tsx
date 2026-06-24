import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@sublets/shared/types";

type Profile = Tables<"profiles">;

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[AuthContext] fetchProfile error:", error.message);
  }
  return data ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  console.log("[AuthProvider] render — loading:", loading, "session:", !!session, "profile:", !!profile);

  async function loadProfile(userId: string) {
    console.log("[AuthProvider] loadProfile start, userId:", userId);
    const p = await fetchProfile(userId);
    console.log("[AuthProvider] loadProfile done, profile:", p?.id ?? "null");
    setProfile(p);
  }

  async function refreshProfile() {
    const userId = session?.user.id;
    if (userId) await loadProfile(userId);
  }

  useEffect(() => {
    console.log("[AuthProvider] useEffect — calling getSession");

    supabase.auth.getSession().then(({ data: { session: s }, error }) => {
      if (error) {
        console.error("[AuthProvider] getSession error:", error.message);
        setLoading(false);
        return;
      }
      console.log("[AuthProvider] getSession result — session:", !!s);
      setSession(s);
      if (s?.user.id) {
        loadProfile(s.user.id).finally(() => {
          console.log("[AuthProvider] loading → false (session path)");
          setLoading(false);
        });
      } else {
        console.log("[AuthProvider] loading → false (no session)");
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, s) => {
      console.log("[AuthProvider] onAuthStateChange:", _event, "session:", !!s);
      setSession(s);
      if (s?.user.id) {
        const p = await fetchProfile(s.user.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    console.log("[AuthProvider] signOut");
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{ loading, session, profile, refreshProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
