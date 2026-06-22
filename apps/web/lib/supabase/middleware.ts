import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv } from "@/lib/env";

// Refreshes the Supabase session on every request and forwards any rotated
// auth cookies onto the outgoing response. No-op when env vars are missing
// (during the windows when Supabase isn't configured yet — e.g. on first
// clone, before .env.local is set).
export async function updateSession(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Touch the session so any rotated tokens get written through setAll().
  // Errors here are ignored — they'll surface in the actual page handler
  // where we have UI to show them.
  await supabase.auth.getUser();

  return response;
}
