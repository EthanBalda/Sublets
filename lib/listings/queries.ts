import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

// Columns safe to show on the public detail view. Omits address_private —
// that field belongs only to the owner's edit/dashboard surface.
const PUBLIC_LISTING_COLUMNS = `
  id, owner_id, campus_id,
  title, housing_type, monthly_rent, security_deposit, utilities_included,
  available_start_date, available_end_date,
  neighborhood, distance_to_campus,
  bedrooms, bathrooms, total_roommates, room_sharing_required,
  parking_available, laundry_available, furnished, pets_allowed,
  appliances, description, lease_status, status, is_featured,
  created_at, updated_at, filled_at
` as const;

export type PublicListing = Omit<Tables<"listings">, "address_private">;

export type OwnerListing = Tables<"listings">;

export type ListerProfileCard = Pick<
  Tables<"profiles">,
  | "id"
  | "full_name"
  | "major"
  | "graduation_year"
  | "bio"
  | "verification_status"
  | "profile_photo_url"
>;

export type ListingPhoto = Tables<"listing_photos">;

// All listings owned by the current profile, ordered for the dashboard.
export async function getOwnListings(
  profileId: string,
): Promise<OwnerListing[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("owner_id", profileId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Listing scoped to the owner — includes address_private. RLS prevents
// non-owners from reading non-published rows; we additionally check
// owner_id on the server to fail loudly on a row the caller doesn't own.
export async function getOwnerListing(
  listingId: string,
  profileId: string,
): Promise<OwnerListing | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .eq("owner_id", profileId)
    .maybeSingle();
  return data;
}

// Public detail query — explicit column allowlist excludes address_private.
// RLS allows both: (a) the public published policy, and (b) the owner-of-own
// policy, so an owner viewing their own draft will see the row here too.
export async function getPublicListing(
  listingId: string,
): Promise<PublicListing | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("listings")
    .select(PUBLIC_LISTING_COLUMNS)
    .eq("id", listingId)
    .maybeSingle();
  return (data ?? null) as PublicListing | null;
}

export async function getListingPhotos(
  listingId: string,
): Promise<ListingPhoto[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("listing_photos")
    .select("*")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getListerProfileCard(
  profileId: string,
): Promise<ListerProfileCard | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, major, graduation_year, bio, verification_status, profile_photo_url",
    )
    .eq("id", profileId)
    .maybeSingle();
  return data;
}
