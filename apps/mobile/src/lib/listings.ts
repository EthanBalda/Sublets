import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@sublets/shared/types";

export type Listing = Tables<"listings">;

export type ListingWithCover = Tables<"listings"> & {
  listing_photos: Pick<Tables<"listing_photos">, "storage_url" | "sort_order">[];
};

export async function getMyListings(profileId: string): Promise<ListingWithCover[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*, listing_photos(storage_url, sort_order)")
    .eq("owner_id", profileId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ListingWithCover[];
}

export async function getListingById(id: string): Promise<Listing | null> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertListing(insert: TablesInsert<"listings">): Promise<Listing> {
  const { data, error } = await supabase
    .from("listings")
    .insert(insert)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveListing(
  id: string,
  update: TablesUpdate<"listings">
): Promise<Listing> {
  const { data, error } = await supabase
    .from("listings")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
