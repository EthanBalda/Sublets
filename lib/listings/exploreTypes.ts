// Pure types + constants + parsers for /explore. Safe to import from
// client components. The server-side query function lives in explore.ts
// alongside its Supabase client import.

export type ExploreSort =
  | "newest"
  | "lowest_price"
  | "earliest_available"
  | "closest_campus"
  | "best_match";

export type ExploreFilters = {
  minPrice: number | null;
  maxPrice: number | null;
  availableStart: string | null;
  availableEnd: string | null;
  housingType: string | null;
  leaseStatus: string | null;
  distanceContains: string | null;
  furnished: boolean;
  parkingAvailable: boolean;
  petsAllowed: boolean;
  roomSharingRequired: boolean;
};

export type ExploreQuery = {
  filters: ExploreFilters;
  sort: ExploreSort;
};

export const SORT_OPTIONS: ReadonlyArray<{
  value: ExploreSort;
  label: string;
}> = [
  { value: "newest", label: "Newest" },
  { value: "best_match", label: "Best match" },
  { value: "lowest_price", label: "Lowest price" },
  { value: "earliest_available", label: "Earliest available" },
  { value: "closest_campus", label: "Closest to campus" },
];

const SORT_VALUES: ReadonlyArray<ExploreSort> = SORT_OPTIONS.map(
  (o) => o.value,
);

export function parseExploreSearchParams(
  sp: Record<string, string | string[] | undefined>,
): ExploreQuery {
  const read = (k: string): string | null => {
    const v = sp[k];
    if (Array.isArray(v)) return v[0] ?? null;
    return v && v.length > 0 ? v : null;
  };
  const readNumber = (k: string): number | null => {
    const v = read(k);
    if (!v) return null;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };
  const readBool = (k: string): boolean => {
    const v = read(k);
    return v === "1" || v === "true" || v === "on";
  };

  const rawSort = read("sort");
  const sort: ExploreSort =
    rawSort && (SORT_VALUES as readonly string[]).includes(rawSort)
      ? (rawSort as ExploreSort)
      : "newest";

  return {
    filters: {
      minPrice: readNumber("min_price"),
      maxPrice: readNumber("max_price"),
      availableStart: read("available_start"),
      availableEnd: read("available_end"),
      housingType: read("housing_type"),
      leaseStatus: read("lease_status"),
      distanceContains: read("distance"),
      furnished: readBool("furnished"),
      parkingAvailable: readBool("parking"),
      petsAllowed: readBool("pets"),
      roomSharingRequired: readBool("sharing"),
    },
    sort,
  };
}

// distance_to_campus is free text ("5 min walk"). Best-effort sort parses
// the leading integer; listings without one sink to the tail of the list.
export function parseDistanceMinutes(
  text: string | null | undefined,
): number | null {
  if (!text) return null;
  const m = text.match(/(\d+)/);
  return m ? Number.parseInt(m[1], 10) : null;
}
