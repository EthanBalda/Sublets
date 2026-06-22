"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOnboardedUser } from "@/lib/auth/session";
import { track } from "@/lib/analytics/track";
import { DEFAULT_CHECKLIST_ITEMS } from "@/lib/requests/constants";

export type CreateRequestState =
  | { status: "idle" }
  | { status: "error"; error: string };

// Create a new pending interest_requests row, OR redirect to the existing
// pending/accepted one if there is one. Other (declined/cancelled/completed)
// previous requests do not block a new one.
export async function createInterestRequest(
  listingId: string,
  _prev: CreateRequestState,
  formData: FormData,
): Promise<CreateRequestState> {
  const session = await requireOnboardedUser();
  const message = String(formData.get("message") ?? "").trim();
  const supabase = await createSupabaseServerClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, owner_id, status")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) return { status: "error", error: "Listing not found." };
  if (listing.status !== "published") {
    return {
      status: "error",
      error: "You can only request published listings.",
    };
  }
  if (listing.owner_id === session.profile.id) {
    return {
      status: "error",
      error: "You can't request your own listing.",
    };
  }

  // Dedupe against open (pending/accepted) requests only.
  const { data: openExisting } = await supabase
    .from("interest_requests")
    .select("id")
    .eq("listing_id", listing.id)
    .eq("seeker_id", session.profile.id)
    .in("status", ["pending", "accepted"])
    .maybeSingle();
  if (openExisting) {
    revalidatePath("/dashboard");
    redirect(`/requests/${openExisting.id}`);
  }

  const { data: created, error } = await supabase
    .from("interest_requests")
    .insert({
      listing_id: listing.id,
      seeker_id: session.profile.id,
      lister_id: listing.owner_id,
      status: "pending",
      message: message.length > 0 ? message : null,
    })
    .select("id")
    .single();
  if (error || !created) {
    return {
      status: "error",
      error: "Couldn't send your request — try again in a moment.",
    };
  }

  await track("interest_request_created", {
    interest_request_id: created.id,
    listing_id: listing.id,
  });
  revalidatePath("/dashboard");
  redirect(`/requests/${created.id}`);
}

// Lister accepts. Sets status=accepted and installs the default checklist
// if it isn't already there. (We dedupe by key to make double-accepts safe;
// there's no DB-level UNIQUE(interest_request_id, key) constraint yet.)
export async function acceptInterestRequest(requestId: string): Promise<void> {
  const session = await requireOnboardedUser();
  const supabase = await createSupabaseServerClient();

  const { data: req } = await supabase
    .from("interest_requests")
    .select("id, lister_id, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) throw new Error("Request not found.");
  if (req.lister_id !== session.profile.id) {
    throw new Error("Only the lister can accept this request.");
  }
  if (req.status !== "pending") {
    throw new Error(`Can't accept a request in status ${req.status}.`);
  }

  const { error: updateError } = await supabase
    .from("interest_requests")
    .update({ status: "accepted" })
    .eq("id", requestId);
  if (updateError) throw updateError;

  // Install default checklist items if missing. Skip any keys that already
  // exist so this is safe to call again.
  const { data: existing } = await supabase
    .from("sublet_checklist_items")
    .select("key")
    .eq("interest_request_id", requestId);
  const existingKeys = new Set((existing ?? []).map((e) => e.key));
  const toInsert = DEFAULT_CHECKLIST_ITEMS.filter(
    (item) => !existingKeys.has(item.key),
  ).map((item) => ({
    interest_request_id: requestId,
    key: item.key,
    label: item.label,
  }));
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("sublet_checklist_items")
      .insert(toInsert);
    if (insertError) throw insertError;
  }

  await track("interest_request_accepted", { interest_request_id: requestId });
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/dashboard");
}

export async function declineInterestRequest(requestId: string): Promise<void> {
  const session = await requireOnboardedUser();
  const supabase = await createSupabaseServerClient();
  const { data: req } = await supabase
    .from("interest_requests")
    .select("id, lister_id, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) throw new Error("Request not found.");
  if (req.lister_id !== session.profile.id) {
    throw new Error("Only the lister can decline this request.");
  }
  if (req.status !== "pending") {
    throw new Error(`Can't decline a request in status ${req.status}.`);
  }
  const { error } = await supabase
    .from("interest_requests")
    .update({ status: "declined" })
    .eq("id", requestId);
  if (error) throw error;
  await track("interest_request_declined", { interest_request_id: requestId });
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/dashboard");
}

export async function cancelInterestRequest(requestId: string): Promise<void> {
  const session = await requireOnboardedUser();
  const supabase = await createSupabaseServerClient();
  const { data: req } = await supabase
    .from("interest_requests")
    .select("id, seeker_id, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) throw new Error("Request not found.");
  if (req.seeker_id !== session.profile.id) {
    throw new Error("Only the seeker can cancel this request.");
  }
  if (req.status !== "pending") {
    throw new Error(`Can't cancel a request in status ${req.status}.`);
  }
  const { error } = await supabase
    .from("interest_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId);
  if (error) throw error;
  await track("interest_request_cancelled", { interest_request_id: requestId });
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/dashboard");
}

// Either party can toggle their own side of a checklist item. We figure out
// which side based on the parent interest_request's seeker/lister ids.
export async function toggleChecklistItem(itemId: string): Promise<void> {
  const session = await requireOnboardedUser();
  const supabase = await createSupabaseServerClient();
  const { data: item } = await supabase
    .from("sublet_checklist_items")
    .select(
      "id, interest_request_id, completed_by_seeker, completed_by_lister",
    )
    .eq("id", itemId)
    .maybeSingle();
  if (!item) throw new Error("Checklist item not found.");

  const { data: req } = await supabase
    .from("interest_requests")
    .select("id, seeker_id, lister_id, status")
    .eq("id", item.interest_request_id)
    .maybeSingle();
  if (!req) throw new Error("Parent request not found.");
  if (req.status !== "accepted") {
    throw new Error("Checklist is only editable for accepted requests.");
  }

  const isSeeker = req.seeker_id === session.profile.id;
  const isLister = req.lister_id === session.profile.id;
  if (!isSeeker && !isLister) {
    throw new Error("You're not a participant of this request.");
  }

  const patch = isSeeker
    ? { completed_by_seeker: !item.completed_by_seeker }
    : { completed_by_lister: !item.completed_by_lister };
  const { error } = await supabase
    .from("sublet_checklist_items")
    .update(patch)
    .eq("id", item.id);
  if (error) throw error;

  revalidatePath(`/requests/${item.interest_request_id}`);
}

// Mark the request completed and flip the listing to filled. Only the lister
// can do this, and only after every checklist item has both sides checked.
export async function completeInterestRequest(requestId: string): Promise<void> {
  const session = await requireOnboardedUser();
  const supabase = await createSupabaseServerClient();

  const { data: req } = await supabase
    .from("interest_requests")
    .select("id, listing_id, lister_id, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) throw new Error("Request not found.");
  if (req.lister_id !== session.profile.id) {
    throw new Error("Only the lister can complete this request.");
  }
  if (req.status !== "accepted") {
    throw new Error(`Can't complete a request in status ${req.status}.`);
  }

  const { data: items, error: itemError } = await supabase
    .from("sublet_checklist_items")
    .select("completed_by_seeker, completed_by_lister")
    .eq("interest_request_id", requestId);
  if (itemError) throw itemError;
  if (!items || items.length === 0) {
    throw new Error("Checklist is empty — accept the request first.");
  }
  const allDone = items.every(
    (i) => i.completed_by_seeker && i.completed_by_lister,
  );
  if (!allDone) {
    throw new Error(
      "Both sides need to finish every checklist item before completing.",
    );
  }

  const now = new Date().toISOString();
  const { error: reqError } = await supabase
    .from("interest_requests")
    .update({ status: "completed", completed_at: now })
    .eq("id", req.id);
  if (reqError) throw reqError;

  // Flip the listing — RLS for listings_owner_update allows this because the
  // lister is the listing owner by construction.
  const { error: listingError } = await supabase
    .from("listings")
    .update({ status: "filled", filled_at: now })
    .eq("id", req.listing_id);
  if (listingError) throw listingError;

  await track("interest_request_completed", {
    interest_request_id: requestId,
    listing_id: req.listing_id,
  });
  await track("listing_marked_filled", {
    listing_id: req.listing_id,
    interest_request_id: requestId,
    source: "request_completed",
  });

  revalidatePath(`/requests/${requestId}`);
  revalidatePath(`/listings/${req.listing_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/explore");
}
