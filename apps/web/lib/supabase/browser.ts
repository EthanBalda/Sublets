import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "./types";

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>;

let cached: BrowserClient | null = null;

// Browser-side Supabase client. Memoized so React renders that mount many
// components don't each instantiate a fresh client (and a fresh auth listener).
export function getSupabaseBrowserClient(): BrowserClient {
  if (cached) return cached;
  const { url, anonKey } = getSupabaseEnv();
  cached = createBrowserClient<Database>(url, anonKey);
  return cached;
}
