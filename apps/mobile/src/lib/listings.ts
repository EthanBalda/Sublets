import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@sublets/shared/types";

export type Listing = Tables<"listings">;

export async function getMyListings(profileId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("owner_id", profileId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
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
