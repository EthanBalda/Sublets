import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "./types";

// Server-side Supabase client for Server Components, Route Handlers, and
// Server Actions. The session is read from cookies on the incoming request;
// refreshed cookies are written back via setAll (no-op in Server Components,
// handled by middleware in the auth milestone).
export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // set() throws from Server Components; middleware will refresh
          // tokens once auth is wired up.
        }
      },
    },
  });
}
