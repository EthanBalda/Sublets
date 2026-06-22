import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  PUBLIC_LISTING_COLUMNS,
  type PublicListing,
} from "@/lib/listings/queries";
import {
  hasEvaluablePreferences,
  scoreListing,
} from "@/lib/listings/bestMatch";
import {
  parseDistanceMinutes,
  type ExploreFilters,
  type ExploreSort,
} from "@/lib/listings/exploreTypes";
import type { Tables } from "@/lib/supabase/types";

// Re-export pure helpers/types so server callers can import everything from
// `@/lib/listings/explore` without knowing about the split.
export {
  SORT_OPTIONS,
  parseExploreSearchParams,
  parseDistanceMinutes,
  type ExploreFilters,
  type ExploreQuery,
  type ExploreSort,
} from "@/lib/listings/exploreTypes";

// Apply filters at the DB level (PostgREST does this efficiently and RLS is
// applied after), then re-sort in app code so we can handle the two complex
// sorts (closest_campus / best_match) uniformly. No pagination yet — capped
// at 50 results.
export async function getExploreListings(
  filters: ExploreFilters,
  sort: ExploreSort,
  profile: Tables<"profiles">,
  campusId: string,
): Promise<PublicListing[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("listings")
    .select(PUBLIC_LISTING_COLUMNS)
    .eq("status", "published")
    .eq("campus_id", campusId);

  if (filters.minPrice !== null) {
    query = query.gte("monthly_rent", filters.minPrice);
  }
  if (filters.maxPrice !== null) {
    query = query.lte("monthly_rent", filters.maxPrice);
  }
  // "I need a sublet starting by X" → listing must be available by then.
  if (filters.availableStart) {
    query = query.lte("available_start_date", filters.availableStart);
  }
  // "...through Y" → listing must still be available on/after Y.
  if (filters.availableEnd) {
    query = query.gte("available_end_date", filters.availableEnd);
  }
  if (filters.housingType) {
    query = query.eq("housing_type", filters.housingType);
  }
  if (filters.leaseStatus) {
    query = query.eq("lease_status", filters.leaseStatus);
  }
  if (filters.distanceContains) {
    query = query.ilike("distance_to_campus", `%${filters.distanceContains}%`);
  }
  // Booleans are only added when the user toggled them on — an unchecked
  // box means "no preference", not "must be false".
  if (filters.furnished) query = query.eq("furnished", true);
  if (filters.parkingAvailable) query = query.eq("parking_available", true);
  if (filters.petsAllowed) query = query.eq("pets_allowed", true);
  if (filters.roomSharingRequired) {
    query = query.eq("room_sharing_required", true);
  }

  const { data, error } = await query.limit(50);
  if (error) throw error;

  const listings = (data ?? []) as unknown as PublicListing[];
  return sortListings(listings, sort, profile);
}

function sortListings(
  listings: PublicListing[],
  sort: ExploreSort,
  profile: Tables<"profiles">,
): PublicListing[] {
  const copy = [...listings];
  switch (sort) {
    case "newest":
      copy.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      return copy;
    case "lowest_price":
      copy.sort((a, b) => a.monthly_rent - b.monthly_rent);
      return copy;
    case "earliest_available":
      copy.sort((a, b) =>
        a.available_start_date.localeCompare(b.available_start_date),
      );
      return copy;
    case "closest_campus": {
      copy.sort((a, b) => {
        const da = parseDistanceMinutes(a.distance_to_campus);
        const db = parseDistanceMinutes(b.distance_to_campus);
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      });
      return copy;
    }
    case "best_match": {
      if (!hasEvaluablePreferences(profile)) {
        copy.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        return copy;
      }
      copy.sort((a, b) => {
        const sa = scoreListing(profile, a).score;
        const sb = scoreListing(profile, b).score;
        if (sa !== sb) return sb - sa;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
      return copy;
    }
  }
}
