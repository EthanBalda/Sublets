"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOnboardedUser } from "@/lib/auth/session";
import { track } from "@/lib/analytics/track";

export type SendMessageResult = { ok: true } | { ok: false; error: string };

// Find an existing conversation for (listing, seeker, lister) or create one.
// Listing must be published and the seeker must not be the listing owner.
// On success, the action redirects — it never returns to the caller.
export async function startConversationForListing(
  listingId: string,
): Promise<void> {
  const session = await requireOnboardedUser();
  const supabase = await createSupabaseServerClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, owner_id, status")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) throw new Error("Listing not found.");
  if (listing.status !== "published") {
    throw new Error("You can only message about published listings.");
  }
  if (listing.owner_id === session.profile.id) {
    throw new Error("You can't message yourself about your own listing.");
  }

  const seekerId = session.profile.id;
  const listerId = listing.owner_id;

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listing.id)
    .eq("seeker_id", seekerId)
    .eq("lister_id", listerId)
    .maybeSingle();

  if (existing) {
    revalidatePath("/messages");
    redirect(`/messages/${existing.id}`);
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      listing_id: listing.id,
      seeker_id: seekerId,
      lister_id: listerId,
    })
    .select("id")
    .single();

  if (error) {
    // Lost a race against another tab — re-fetch by the unique key.
    if (/duplicate key/i.test(error.message)) {
      const { data: refound } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listing.id)
        .eq("seeker_id", seekerId)
        .eq("lister_id", listerId)
        .single();
      if (refound) {
        revalidatePath("/messages");
        redirect(`/messages/${refound.id}`);
      }
    }
    throw error;
  }

  revalidatePath("/messages");
  redirect(`/messages/${created.id}`);
}

// Insert a message and bump the parent conversation's updated_at so it
// sorts to the top of /messages on the sender's next render.
export async function sendMessage(
  conversationId: string,
  _prev: SendMessageResult,
  formData: FormData,
): Promise<SendMessageResult> {
  const session = await requireOnboardedUser();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "Type a message before sending." };
  if (body.length > 4000) {
    return { ok: false, error: "Messages are capped at 4000 characters." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, seeker_id, lister_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!convo) return { ok: false, error: "Conversation not found." };
  if (
    convo.seeker_id !== session.profile.id &&
    convo.lister_id !== session.profile.id
  ) {
    return { ok: false, error: "You're not in this conversation." };
  }

  const { error: insertError } = await supabase.from("messages").insert({
    conversation_id: convo.id,
    sender_id: session.profile.id,
    body,
  });
  if (insertError) {
    return { ok: false, error: "Couldn't send your message — try again." };
  }

  // Bump updated_at so the conversation sorts correctly on /messages.
  // (The conversations_set_updated_at trigger would also do this on any
  // UPDATE, but setting it explicitly keeps the action self-contained.)
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", convo.id);

  await track("message_sent", { conversation_id: convo.id });

  revalidatePath(`/messages/${convo.id}`);
  revalidatePath("/messages");
  return { ok: true };
}
