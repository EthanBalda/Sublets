import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  PUBLIC_LISTING_COLUMNS,
  type PublicListing,
} from "@/lib/listings/queries";
import type { Tables } from "@/lib/supabase/types";

export type RequestListItem = {
  id: string;
  listing_id: string;
  seeker_id: string;
  lister_id: string;
  status: Tables<"interest_requests">["status"];
  message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  listing: Pick<PublicListing, "id" | "title" | "status"> | null;
  other_party: Pick<Tables<"profiles">, "id" | "full_name"> | null;
};

async function listRequests(
  whereField: "lister_id" | "seeker_id",
  profileId: string,
): Promise<RequestListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data: reqs, error } = await supabase
    .from("interest_requests")
    .select(
      "id, listing_id, seeker_id, lister_id, status, message, created_at, updated_at, completed_at",
    )
    .eq(whereField, profileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!reqs || reqs.length === 0) return [];

  const listingIds = Array.from(new Set(reqs.map((r) => r.listing_id)));
  const otherIds = Array.from(
    new Set(
      reqs.map((r) =>
        whereField === "lister_id" ? r.seeker_id : r.lister_id,
      ),
    ),
  );

  const [{ data: listingRows }, { data: profileRows }] = await Promise.all([
    supabase
      .from("listings")
      .select("id, title, status")
      .in("id", listingIds),
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", otherIds),
  ]);

  const listingsById = new Map(
    (listingRows ?? []).map((l) => [l.id, l] as const),
  );
  const profilesById = new Map(
    (profileRows ?? []).map((p) => [p.id, p] as const),
  );

  return reqs.map((r) => ({
    ...r,
    listing: listingsById.get(r.listing_id) ?? null,
    other_party:
      profilesById.get(
        whereField === "lister_id" ? r.seeker_id : r.lister_id,
      ) ?? null,
  }));
}

export async function getIncomingRequestsForLister(
  profileId: string,
): Promise<RequestListItem[]> {
  return listRequests("lister_id", profileId);
}

export async function getOutgoingRequestsForSeeker(
  profileId: string,
): Promise<RequestListItem[]> {
  return listRequests("seeker_id", profileId);
}

export type RequestDetails = {
  id: string;
  listing_id: string;
  seeker_id: string;
  lister_id: string;
  status: Tables<"interest_requests">["status"];
  message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  listing: PublicListing | null;
  seeker: Pick<
    Tables<"profiles">,
    "id" | "full_name" | "major" | "graduation_year" | "bio"
  > | null;
  lister: Pick<
    Tables<"profiles">,
    "id" | "full_name" | "major" | "graduation_year" | "bio"
  > | null;
};

export async function getRequestDetails(
  requestId: string,
  profileId: string,
): Promise<RequestDetails | null> {
  const supabase = await createSupabaseServerClient();
  const { data: req } = await supabase
    .from("interest_requests")
    .select(
      "id, listing_id, seeker_id, lister_id, status, message, created_at, updated_at, completed_at",
    )
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return null;
  if (req.seeker_id !== profileId && req.lister_id !== profileId) {
    return null;
  }

  const [{ data: listing }, { data: profiles }] = await Promise.all([
    supabase
      .from("listings")
      .select(PUBLIC_LISTING_COLUMNS)
      .eq("id", req.listing_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, full_name, major, graduation_year, bio")
      .in("id", [req.seeker_id, req.lister_id]),
  ]);

  const byId = new Map((profiles ?? []).map((p) => [p.id, p] as const));

  return {
    ...req,
    listing: (listing ?? null) as PublicListing | null,
    seeker: byId.get(req.seeker_id) ?? null,
    lister: byId.get(req.lister_id) ?? null,
  };
}

export type ChecklistItem = Tables<"sublet_checklist_items">;

export async function getChecklistItems(
  interestRequestId: string,
): Promise<ChecklistItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("sublet_checklist_items")
    .select("*")
    .eq("interest_request_id", interestRequestId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function isChecklistFullyComplete(items: ChecklistItem[]): boolean {
  if (items.length === 0) return false;
  return items.every(
    (i) => i.completed_by_seeker && i.completed_by_lister,
  );
}
