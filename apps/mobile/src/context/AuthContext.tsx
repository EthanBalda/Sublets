import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@sublets/shared/types";

type Profile = Tables<"profiles">;

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  authPhase: string;
  authError: string | null;
  refreshProfile: () => Promise<void>;
  retryAuth: () => Promise<void>;
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
    if (__DEV__) console.error("[AuthContext] fetchProfile error:", error.message);
    throw new Error(error.message);
  }
  return data ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authPhase, setAuthPhase] = useState("initializing");
  const [authError, setAuthError] = useState<string | null>(null);

  // Incremented by retryAuth to invalidate any in-flight settle() from the effect.
  const settleGenRef = useRef(0);

  async function refreshProfile() {
    const userId = session?.user.id;
    if (!userId) return;
    try {
      const p = await fetchProfile(userId);
      setProfile(p);
    } catch (e: unknown) {
      if (__DEV__) console.error("[AuthProvider] refreshProfile error:", e);
    }
  }

  async function retryAuth() {
    // Invalidate any pending settle() from the initial effect so it can't
    // overwrite our state after this function completes.
    ++settleGenRef.current;
    setLoading(true);
    setAuthError(null);
    setAuthPhase("retrying");
    if (__DEV__) console.log("[AuthProvider] retryAuth — getSession start");
    try {
      const {
        data: { session: s },
        error,
      } = await supabase.auth.getSession();
      if (__DEV__) console.log("[AuthProvider] retryAuth — getSession end, session:", !!s);
      if (error) throw error;
      setSession(s);
      if (s?.user.id) {
        setAuthPhase("loading profile");
        const p = await fetchProfile(s.user.id);
        setProfile(p);
        if (__DEV__) console.log("[AuthProvider] retryAuth — profile:", !!p);
      } else {
        setProfile(null);
      }
      setAuthPhase("ready");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Retry failed";
      if (__DEV__) console.error("[AuthProvider] retryAuth error:", msg);
      setAuthError(msg);
      setAuthPhase("error");
    } finally {
      setLoading(false);
      if (__DEV__) console.log("[AuthProvider] retryAuth — loading → false");
    }
  }

  useEffect(() => {
    if (__DEV__) console.log("[AuthProvider] mounted");

    const gen = ++settleGenRef.current;
    let cancelled = false;

    function settle(err?: string) {
      // Ignore if retryAuth superseded this effect, or if the component unmounted.
      if (settleGenRef.current !== gen || cancelled) return;
      if (err) setAuthError(err);
      setAuthPhase(err ? "error" : "ready");
      setLoading(false);
      if (__DEV__) console.log("[AuthProvider] loading → false", err ?? "");
    }

    // Hard failsafe: unblock the UI after 10 s regardless of network state.
    const timeout = setTimeout(() => {
      if (__DEV__) console.warn("[AuthProvider] 10 s startup timeout — forcing loading=false");
      settle("Startup timed out. Check your connection and try again.");
    }, 10_000);

    setAuthPhase("loading session");
    if (__DEV__) console.log("[AuthProvider] getSession start");

    supabase.auth
      .getSession()
      .then(({ data: { session: s }, error }) => {
        if (__DEV__) {
          console.log(
            "[AuthProvider] getSession end — session:", !!s,
            "error:", error?.message ?? null
          );
        }
        if (error) {
          setSession(null);
          settle(error.message);
          return;
        }
        setSession(s);
        if (s?.user.id) {
          setAuthPhase("loading profile");
          if (__DEV__) console.log("[AuthProvider] profile query start");
          fetchProfile(s.user.id)
            .then((p) => {
              setProfile(p);
              if (__DEV__) console.log("[AuthProvider] profile query end — found:", !!p);
            })
            .catch((e: unknown) => {
              const msg = e instanceof Error ? e.message : "Profile load failed";
              if (__DEV__) console.error("[AuthProvider] profile query error:", msg);
              setAuthError(msg);
            })
            .finally(() => settle());
        } else {
          settle();
        }
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "getSession threw unexpectedly";
        if (__DEV__) console.error("[AuthProvider] getSession threw:", msg);
        settle(msg);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (__DEV__) console.log("[AuthProvider] onAuthStateChange — session:", !!s);
      setSession(s);
      try {
        if (s?.user.id) {
          const p = await fetchProfile(s.user.id);
          setProfile(p);
          if (__DEV__) console.log("[AuthProvider] onAuthStateChange profile:", !!p);
        } else {
          setProfile(null);
        }
      } catch (e: unknown) {
        if (__DEV__) console.error("[AuthProvider] onAuthStateChange profile error:", e);
      } finally {
        settle();
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        loading,
        session,
        profile,
        authPhase,
        authError,
        refreshProfile,
        retryAuth,
        signOut,
      }}
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
