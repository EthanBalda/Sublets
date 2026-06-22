// Option sets for listing form selects + display labels.
// Values match the schema's free-text columns (no enum constraints in
// Postgres), but keeping them centralized prevents drift.

import type { ListingStatus } from "./types";

export const HOUSING_TYPES = [
  { value: "private_room", label: "Private room" },
  { value: "shared_room", label: "Shared room" },
  { value: "studio", label: "Studio" },
  { value: "1br_apartment", label: "1BR apartment" },
  { value: "2br_apartment", label: "2BR apartment" },
  { value: "house_room", label: "Room in a house" },
  { value: "entire_house", label: "Entire house" },
  { value: "other", label: "Other" },
] as const;

export const UTILITIES_INCLUDED = [
  { value: "all_included", label: "All utilities included" },
  { value: "partial_water_trash", label: "Partial (water/trash only)" },
  { value: "none", label: "No utilities included" },
  { value: "ask_lister", label: "Ask the lister" },
] as const;

export const LEASE_STATUSES = [
  { value: "have_signed_lease", label: "I have a signed lease" },
  { value: "need_landlord_approval", label: "Need landlord approval" },
  { value: "verbal_agreement", label: "Verbal agreement only" },
  { value: "unknown", label: "Not sure" },
] as const;

export const APPLIANCE_OPTIONS = [
  { value: "fridge", label: "Fridge" },
  { value: "stove", label: "Stove" },
  { value: "oven", label: "Oven" },
  { value: "microwave", label: "Microwave" },
  { value: "dishwasher", label: "Dishwasher" },
  { value: "in_unit_laundry", label: "In-unit laundry" },
  { value: "laundry_in_building", label: "Laundry in building" },
  { value: "ac", label: "Air conditioning" },
] as const;

export const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  draft: "Draft",
  published: "Published",
  paused: "Paused",
  filled: "Filled",
  expired: "Expired",
  removed: "Removed",
};

export function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}
