import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables, ReportStatus, ListingStatus } from "@/lib/supabase/types";

const ADMIN_PAGE_LIMIT = 50;

export type AdminReport = Tables<"reports"> & {
  reporter: Pick<Tables<"profiles">, "id" | "full_name"> | null;
  reported_user: Pick<Tables<"profiles">, "id" | "full_name"> | null;
  listing: Pick<Tables<"listings">, "id" | "title" | "status"> | null;
  // Convo summary kept tight — admins shouldn't be reading messages here.
  conversation: {
    id: string;
    seeker: Pick<Tables<"profiles">, "id" | "full_name"> | null;
    lister: Pick<Tables<"profiles">, "id" | "full_name"> | null;
    listing: Pick<Tables<"listings">, "id" | "title"> | null;
  } | null;
};

export async function getReports(
  statusFilter: ReportStatus | "all",
): Promise<AdminReport[]> {
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(ADMIN_PAGE_LIMIT);
  if (statusFilter !== "all") q = q.eq("status", statusFilter);
  const { data, error } = await q;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const profileIds = new Set<string>();
  const listingIds = new Set<string>();
  const conversationIds = new Set<string>();
  for (const r of data) {
    profileIds.add(r.reporter_id);
    if (r.reported_user_id) profileIds.add(r.reported_user_id);
    if (r.listing_id) listingIds.add(r.listing_id);
    if (r.conversation_id) conversationIds.add(r.conversation_id);
  }

  const [{ data: profileRows }, { data: listingRows }, { data: convoRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", Array.from(profileIds)),
      supabase
        .from("listings")
        .select("id, title, status")
        .in("id", Array.from(listingIds)),
      conversationIds.size > 0
        ? supabase
            .from("conversations")
            .select("id, listing_id, seeker_id, lister_id")
            .in("id", Array.from(conversationIds))
        : Promise.resolve({ data: [] }),
    ]);

  // For conversation summaries we also need to resolve listing + participant
  // info. Pull any not-already-fetched bits.
  const extraListingIds = new Set<string>();
  const extraProfileIds = new Set<string>();
  for (const c of convoRows ?? []) {
    if (c.listing_id && !listingIds.has(c.listing_id))
      extraListingIds.add(c.listing_id);
    extraProfileIds.add(c.seeker_id);
    extraProfileIds.add(c.lister_id);
  }
  const [{ data: extraListings }, { data: extraProfiles }] = await Promise.all([
    extraListingIds.size > 0
      ? supabase
          .from("listings")
          .select("id, title, status")
          .in("id", Array.from(extraListingIds))
      : Promise.resolve({ data: [] }),
    extraProfileIds.size > 0
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", Array.from(extraProfileIds))
      : Promise.resolve({ data: [] }),
  ]);

  const profilesById = new Map(
    [...(profileRows ?? []), ...(extraProfiles ?? [])].map(
      (p) => [p.id, p] as const,
    ),
  );
  const listingsById = new Map(
    [...(listingRows ?? []), ...(extraListings ?? [])].map(
      (l) => [l.id, l] as const,
    ),
  );
  const conversationsById = new Map(
    (convoRows ?? []).map((c) => [c.id, c] as const),
  );

  return data.map((r) => {
    const convoRow = r.conversation_id
      ? conversationsById.get(r.conversation_id)
      : null;
    return {
      ...r,
      reporter: profilesById.get(r.reporter_id) ?? null,
      reported_user: r.reported_user_id
        ? (profilesById.get(r.reported_user_id) ?? null)
        : null,
      listing: r.listing_id ? (listingsById.get(r.listing_id) ?? null) : null,
      conversation: convoRow
        ? {
            id: convoRow.id,
            seeker: profilesById.get(convoRow.seeker_id) ?? null,
            lister: profilesById.get(convoRow.lister_id) ?? null,
            listing: convoRow.listing_id
              ? (listingsById.get(convoRow.listing_id) ?? null)
              : null,
          }
        : null,
    };
  });
}

export type AdminListing = Tables<"listings"> & {
  owner: Pick<Tables<"profiles">, "id" | "full_name"> | null;
};

export async function getAllListings(
  statusFilter: ListingStatus | "all",
): Promise<AdminListing[]> {
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("listings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(ADMIN_PAGE_LIMIT);
  if (statusFilter !== "all") q = q.eq("status", statusFilter);
  const { data, error } = await q;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const ownerIds = Array.from(new Set(data.map((l) => l.owner_id)));
  const { data: owners } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", ownerIds);
  const byId = new Map((owners ?? []).map((p) => [p.id, p] as const));

  return data.map((l) => ({
    ...l,
    owner: byId.get(l.owner_id) ?? null,
  }));
}

export type AdminProfile = Pick<
  Tables<"profiles">,
  | "id"
  | "user_id"
  | "full_name"
  | "major"
  | "graduation_year"
  | "role"
  | "is_admin"
  | "is_suspended"
  | "verification_status"
  | "id_verification_status"
  | "created_at"
>;

export async function getAllProfiles(
  filter: "all" | "active" | "suspended",
): Promise<AdminProfile[]> {
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("profiles")
    .select(
      "id, user_id, full_name, major, graduation_year, role, is_admin, is_suspended, verification_status, id_verification_status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(ADMIN_PAGE_LIMIT);
  if (filter === "active") q = q.eq("is_suspended", false);
  if (filter === "suspended") q = q.eq("is_suspended", true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export const ADMIN_LIMIT = ADMIN_PAGE_LIMIT;
