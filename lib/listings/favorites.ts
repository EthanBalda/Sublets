"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOnboardedUser } from "@/lib/auth/session";
import {
  PUBLIC_LISTING_COLUMNS,
  type PublicListing,
} from "@/lib/listings/queries";

// Build a Set of listing_ids the current profile has favorited. Used by
// /explore and /listings/[id] to decide which heart icons render filled.
export async function getFavoriteListingIds(
  profileId: string,
): Promise<Set<string>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", profileId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.listing_id));
}

export async function isListingSaved(
  profileId: string,
  listingId: string,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", profileId)
    .eq("listing_id", listingId)
    .maybeSingle();
  return Boolean(data);
}

export type SavedListing = PublicListing & { favorited_at: string };

// Fetch the user's saved listings. The favorites row is the source of truth
// for which listings to include; the listings themselves come back through
// the address-omitted projection (just like /explore) regardless of status.
// A saved listing whose status changed to paused/filled/etc. still appears,
// with status filled in so the UI can render a badge.
export async function getSavedListings(
  profileId: string,
): Promise<SavedListing[]> {
  const supabase = await createSupabaseServerClient();
  const { data: favs, error: favError } = await supabase
    .from("favorites")
    .select("listing_id, created_at")
    .eq("user_id", profileId)
    .order("created_at", { ascending: false });
  if (favError) throw favError;
  if (!favs || favs.length === 0) return [];

  const ids = favs.map((f) => f.listing_id);
  const { data: rows, error: listingError } = await supabase
    .from("listings")
    .select(PUBLIC_LISTING_COLUMNS)
    .in("id", ids);
  if (listingError) throw listingError;

  // Index by id so we can preserve favorite-order (newest save first).
  const byId = new Map<string, PublicListing>();
  for (const row of (rows ?? []) as unknown as PublicListing[]) {
    byId.set(row.id, row);
  }

  const result: SavedListing[] = [];
  for (const f of favs) {
    const listing = byId.get(f.listing_id);
    if (!listing) continue; // listing hard-deleted; favorite is orphan
    result.push({ ...listing, favorited_at: f.created_at });
  }
  return result;
}

// Idempotent toggle. Insert if missing, delete if present. Returns the new
// state so optimistic UIs can confirm, though the page revalidation is what
// drives the visible state in the current MVP.
export async function toggleFavorite(listingId: string): Promise<boolean> {
  const session = await requireOnboardedUser();
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", session.profile.id)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("id", existing.id);
    if (error) throw error;
    revalidatePath("/explore");
    revalidatePath("/saved");
    revalidatePath(`/listings/${listingId}`);
    return false;
  }

  const { error } = await supabase.from("favorites").insert({
    user_id: session.profile.id,
    listing_id: listingId,
  });
  // The favorites table has a UNIQUE(user_id, listing_id) — if a concurrent
  // request inserted between our SELECT and INSERT, swallow the conflict so
  // the user-visible result is still "saved".
  if (error && !/duplicate key/i.test(error.message)) {
    throw error;
  }
  revalidatePath("/explore");
  revalidatePath("/saved");
  revalidatePath(`/listings/${listingId}`);
  return true;
}
