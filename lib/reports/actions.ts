"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOnboardedUser } from "@/lib/auth/session";
import {
  REPORT_REASON_VALUES,
  type ReportReason,
} from "@/lib/reports/constants";

export type ReportTarget =
  | { kind: "listing"; listingId: string }
  | { kind: "conversation"; conversationId: string }
  | { kind: "user"; userId: string };

export type CreateReportState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "error"; error: string };

function isValidReason(v: string): v is ReportReason {
  return (REPORT_REASON_VALUES as readonly string[]).includes(v);
}

// Insert a report row in status='open'. Reporter is always the current user.
// Conversation reports additionally verify the user is a participant — the
// other two report kinds have no membership prerequisite (anyone can report
// a listing or a user they came across).
export async function createReport(
  target: ReportTarget,
  _prev: CreateReportState,
  formData: FormData,
): Promise<CreateReportState> {
  const session = await requireOnboardedUser();
  const reason = String(formData.get("reason") ?? "");
  const details = String(formData.get("details") ?? "").trim();

  if (!reason) {
    return { status: "error", error: "Pick a reason for the report." };
  }
  if (!isValidReason(reason)) {
    return { status: "error", error: "That reason isn't valid." };
  }

  const supabase = await createSupabaseServerClient();

  // For conversation reports, gate on participant membership AND
  // automatically tag the other party as the reported user so an admin sees
  // who the complaint is about.
  let reportedUserId: string | null = null;
  let listingId: string | null = null;
  let conversationId: string | null = null;

  if (target.kind === "conversation") {
    const { data: convo } = await supabase
      .from("conversations")
      .select("id, seeker_id, lister_id")
      .eq("id", target.conversationId)
      .maybeSingle();
    if (!convo) {
      return { status: "error", error: "Conversation not found." };
    }
    if (
      convo.seeker_id !== session.profile.id &&
      convo.lister_id !== session.profile.id
    ) {
      return {
        status: "error",
        error: "You can only report conversations you're a participant of.",
      };
    }
    conversationId = convo.id;
    reportedUserId =
      convo.seeker_id === session.profile.id ? convo.lister_id : convo.seeker_id;
  } else if (target.kind === "listing") {
    // Tag the listing owner as the reported user so admins have a person to
    // act on, not just a listing.
    const { data: listing } = await supabase
      .from("listings")
      .select("id, owner_id")
      .eq("id", target.listingId)
      .maybeSingle();
    if (!listing) {
      return { status: "error", error: "Listing not found." };
    }
    listingId = listing.id;
    reportedUserId =
      listing.owner_id !== session.profile.id ? listing.owner_id : null;
  } else {
    // kind === "user"
    if (target.userId === session.profile.id) {
      return { status: "error", error: "You can't report yourself." };
    }
    reportedUserId = target.userId;
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: session.profile.id,
    reported_user_id: reportedUserId,
    listing_id: listingId,
    conversation_id: conversationId,
    reason,
    details: details.length > 0 ? details : null,
    status: "open",
  });

  if (error) {
    return {
      status: "error",
      error: "Couldn't submit your report — try again in a moment.",
    };
  }

  revalidatePath("/admin");
  return { status: "sent" };
}
