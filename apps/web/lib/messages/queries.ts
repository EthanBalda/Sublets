import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  PUBLIC_LISTING_COLUMNS,
  type PublicListing,
} from "@/lib/listings/queries";
import type { Tables } from "@/lib/supabase/types";

export type ConversationListItem = {
  id: string;
  listing_id: string;
  seeker_id: string;
  lister_id: string;
  updated_at: string;
  // Other side of the conversation (relative to the current user).
  other_party: Pick<Tables<"profiles">, "id" | "full_name"> | null;
  listing: Pick<PublicListing, "id" | "title" | "status"> | null;
  last_message: { body: string; created_at: string } | null;
};

// Fetch every conversation the user participates in, joined with the bits the
// /messages list needs. Listings are looked up via the address-omitted
// projection so we can't accidentally surface address_private here either.
export async function getConversationsForUser(
  profileId: string,
): Promise<ConversationListItem[]> {
  const supabase = await createSupabaseServerClient();

  const { data: convos, error } = await supabase
    .from("conversations")
    .select("id, listing_id, seeker_id, lister_id, updated_at")
    .or(`seeker_id.eq.${profileId},lister_id.eq.${profileId}`)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  if (!convos || convos.length === 0) return [];

  const listingIds = Array.from(new Set(convos.map((c) => c.listing_id)));
  const otherIds = Array.from(
    new Set(
      convos.map((c) =>
        c.seeker_id === profileId ? c.lister_id : c.seeker_id,
      ),
    ),
  );

  const [{ data: listingRows }, { data: profileRows }, { data: messageRows }] =
    await Promise.all([
      supabase
        .from("listings")
        .select("id, title, status")
        .in("id", listingIds),
      supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", otherIds),
      // Pull every message for these conversations once, then take the most
      // recent per conversation in JS. PostgREST has no per-group LIMIT;
      // doing N queries would be N+1.
      supabase
        .from("messages")
        .select("conversation_id, body, created_at")
        .in(
          "conversation_id",
          convos.map((c) => c.id),
        )
        .order("created_at", { ascending: false }),
    ]);

  const listingsById = new Map(
    (listingRows ?? []).map((l) => [l.id, l] as const),
  );
  const profilesById = new Map(
    (profileRows ?? []).map((p) => [p.id, p] as const),
  );
  const lastByConvId = new Map<string, { body: string; created_at: string }>();
  for (const msg of messageRows ?? []) {
    if (!lastByConvId.has(msg.conversation_id)) {
      lastByConvId.set(msg.conversation_id, {
        body: msg.body,
        created_at: msg.created_at,
      });
    }
  }

  return convos.map((c) => {
    const otherId = c.seeker_id === profileId ? c.lister_id : c.seeker_id;
    return {
      id: c.id,
      listing_id: c.listing_id,
      seeker_id: c.seeker_id,
      lister_id: c.lister_id,
      updated_at: c.updated_at,
      other_party: profilesById.get(otherId) ?? null,
      listing: listingsById.get(c.listing_id) ?? null,
      last_message: lastByConvId.get(c.id) ?? null,
    };
  });
}

export type ConversationDetails = {
  id: string;
  listing_id: string;
  seeker_id: string;
  lister_id: string;
  updated_at: string;
  listing: PublicListing | null;
  seeker: Pick<Tables<"profiles">, "id" | "full_name"> | null;
  lister: Pick<Tables<"profiles">, "id" | "full_name"> | null;
};

// Fetch a single conversation if the current user is a participant. RLS
// enforces this too; we additionally check on the server so a non-participant
// hitting the URL gets a clean "not found" instead of an empty render.
export async function getConversationDetails(
  conversationId: string,
  profileId: string,
): Promise<ConversationDetails | null> {
  const supabase = await createSupabaseServerClient();
  const { data: convo } = await supabase
    .from("conversations")
    .select("id, listing_id, seeker_id, lister_id, updated_at")
    .eq("id", conversationId)
    .maybeSingle();
  if (!convo) return null;
  if (convo.seeker_id !== profileId && convo.lister_id !== profileId) {
    return null;
  }

  const [{ data: listing }, { data: profiles }] = await Promise.all([
    supabase
      .from("listings")
      .select(PUBLIC_LISTING_COLUMNS)
      .eq("id", convo.listing_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", [convo.seeker_id, convo.lister_id]),
  ]);

  const profilesById = new Map((profiles ?? []).map((p) => [p.id, p] as const));

  return {
    id: convo.id,
    listing_id: convo.listing_id,
    seeker_id: convo.seeker_id,
    lister_id: convo.lister_id,
    updated_at: convo.updated_at,
    listing: (listing ?? null) as PublicListing | null,
    seeker: profilesById.get(convo.seeker_id) ?? null,
    lister: profilesById.get(convo.lister_id) ?? null,
  };
}

export type ThreadMessage = Pick<
  Tables<"messages">,
  "id" | "conversation_id" | "sender_id" | "body" | "read_at" | "created_at"
>;

export async function getMessagesForConversation(
  conversationId: string,
): Promise<ThreadMessage[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, read_at, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
