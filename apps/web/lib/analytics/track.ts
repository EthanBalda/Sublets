import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/auth/session";
import { hasSupabaseEnv } from "@/lib/env";

export type TrackedEvent =
  | "signup_completed"
  | "profile_completed"
  | "listing_created"
  | "listing_published"
  | "listing_viewed"
  | "listing_saved"
  | "listing_unsaved"
  | "message_sent"
  | "interest_request_created"
  | "interest_request_accepted"
  | "interest_request_declined"
  | "interest_request_cancelled"
  | "interest_request_completed"
  | "listing_marked_filled"
  | "report_submitted";

// JSON-safe scalar set we accept in metadata. Keeping this tight avoids
// accidentally storing things like Dates or undefined that would round-trip
// poorly through jsonb.
type Scalar = string | number | boolean | null;
export type TrackMetadata = Record<string, Scalar>;

// Best-effort event insert. Wrapped in try/catch so a Supabase blip never
// breaks the parent flow — analytics is *forensic*, not transactional.
//
// user_id is sourced from the current session's profile (null when the
// caller has no profile yet, e.g. at signup_completed time). The RLS policy
// analytics_self_insert accepts user_id IS NULL or user_id = me.
export async function track(
  eventName: TrackedEvent,
  metadata: TrackMetadata = {},
): Promise<void> {
  if (!hasSupabaseEnv()) return;
  try {
    const session = await getCurrentSession();
    const supabase = await createSupabaseServerClient();
    await supabase.from("analytics_events").insert({
      user_id: session.profile?.id ?? null,
      event_name: eventName,
      metadata_json: metadata,
    });
  } catch {
    // Silent — analytics must never break the action that called it.
  }
}
