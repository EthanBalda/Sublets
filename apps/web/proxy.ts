import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

// Next 16 renamed `middleware.ts` → `proxy.ts`. Same runtime behavior.
// We use it solely to refresh Supabase sessions on every request; route
// gating is handled in server components via lib/auth/session.ts.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)",
  ],
};
