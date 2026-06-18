import type { Tables } from "@/lib/supabase/types";
import type { PublicListing } from "@/lib/listings/queries";

// Tiny rules-based scorer that converts a user's profile preferences into a
// preference-match score for a listing. Higher is better.
//
// Only two preference axes have a direct counterpart on listings:
//   - pets_preference        ↔ pets_allowed
//   - room_sharing_preference ↔ room_sharing_required
//
// Lifestyle prefs like cleanliness/noise/sleep_schedule have no listing-side
// field, so they're ignored. Explicitly not AI — just deterministic rules.
//
// Returned score:
//   { score: number of matched rules, evaluable: number of rules attempted }
//
// `evaluable === 0` means the user has neither preference set, in which case
// callers should fall back to a default sort (newest).

type ScoredProfile = Pick<
  Tables<"profiles">,
  "pets_preference" | "room_sharing_preference"
>;

export type MatchScore = {
  score: number;
  evaluable: number;
};

export function scoreListing(
  profile: ScoredProfile,
  listing: Pick<PublicListing, "pets_allowed" | "room_sharing_required">,
): MatchScore {
  let score = 0;
  let evaluable = 0;

  if (profile.pets_preference) {
    evaluable += 1;
    if (
      (profile.pets_preference === "no_pets" && !listing.pets_allowed) ||
      (profile.pets_preference === "ok_with_pets" && listing.pets_allowed) ||
      (profile.pets_preference === "has_pets" && listing.pets_allowed)
    ) {
      score += 1;
    }
  }

  if (profile.room_sharing_preference) {
    evaluable += 1;
    if (
      (profile.room_sharing_preference === "no_sharing" &&
        !listing.room_sharing_required) ||
      (profile.room_sharing_preference === "prefer_sharing" &&
        listing.room_sharing_required)
    ) {
      score += 1;
    }
    // "ok_sharing" is neutral — no point either way.
  }

  return { score, evaluable };
}

export function hasEvaluablePreferences(profile: ScoredProfile): boolean {
  return Boolean(
    profile.pets_preference || profile.room_sharing_preference,
  );
}
