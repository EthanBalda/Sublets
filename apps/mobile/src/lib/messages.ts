import { supabase } from "@/lib/supabase";

export type ConversationItem = {
  id: string;
  listing_id: string;
  seeker_id: string;
  lister_id: string;
  updated_at: string;
  other_party_name: string | null;
  listing_title: string | null;
  last_message_body: string | null;
  last_message_at: string | null;
};

export type ThreadMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export async function getMyConversations(profileId: string): Promise<ConversationItem[]> {
  const { data: convos, error } = await supabase
    .from("conversations")
    .select("id, listing_id, seeker_id, lister_id, updated_at")
    .or(`seeker_id.eq.${profileId},lister_id.eq.${profileId}`)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  if (!convos || convos.length === 0) return [];

  const listingIds = [...new Set(convos.map((c) => c.listing_id))];
  const otherIds = [
    ...new Set(
      convos.map((c) => (c.seeker_id === profileId ? c.lister_id : c.seeker_id))
    ),
  ];

  const [{ data: listings }, { data: profiles }, { data: msgs }] = await Promise.all([
    supabase.from("listings").select("id, title").in("id", listingIds),
    supabase.from("profiles").select("id, full_name").in("id", otherIds),
    supabase
      .from("messages")
      .select("conversation_id, body, created_at")
      .in("conversation_id", convos.map((c) => c.id))
      .order("created_at", { ascending: false }),
  ]);

  const listingsById = new Map((listings ?? []).map((l) => [l.id, l]));
  const profilesById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const lastMsgByConvoId = new Map<string, { body: string; created_at: string }>();
  for (const m of msgs ?? []) {
    if (!lastMsgByConvoId.has(m.conversation_id)) {
      lastMsgByConvoId.set(m.conversation_id, { body: m.body, created_at: m.created_at });
    }
  }

  return convos.map((c) => {
    const otherId = c.seeker_id === profileId ? c.lister_id : c.seeker_id;
    const last = lastMsgByConvoId.get(c.id);
    return {
      id: c.id,
      listing_id: c.listing_id,
      seeker_id: c.seeker_id,
      lister_id: c.lister_id,
      updated_at: c.updated_at,
      other_party_name: profilesById.get(otherId)?.full_name ?? null,
      listing_title: listingsById.get(c.listing_id)?.title ?? null,
      last_message_body: last?.body ?? null,
      last_message_at: last?.created_at ?? null,
    };
  });
}

// Seeker-only: RLS allows seeker to INSERT conversations.
export async function getOrCreateConversation(
  listingId: string,
  seekerId: string,
  listerId: string
): Promise<string> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("seeker_id", seekerId)
    .eq("lister_id", listerId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ listing_id: listingId, seeker_id: seekerId, lister_id: listerId })
    .select("id")
    .single();

  if (error) {
    // Race: unique violation — another insert won; re-fetch.
    if (error.code === "23505" || /duplicate/i.test(error.message)) {
      const { data: found } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listingId)
        .eq("seeker_id", seekerId)
        .eq("lister_id", listerId)
        .single();
      if (found) return found.id;
    }
    throw error;
  }

  return created.id;
}

// Lister-only path: find existing conversation (listers cannot create).
export async function findConversation(
  listingId: string,
  seekerId: string,
  listerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("seeker_id", seekerId)
    .eq("lister_id", listerId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function getMessages(conversationId: string): Promise<ThreadMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string
): Promise<void> {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    body,
  });
  if (error) throw error;

  // Bump updated_at so the conversation sorts to the top.
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}
