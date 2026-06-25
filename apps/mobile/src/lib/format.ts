/** Housing type label, studio-aware. "shared_room" → "Shared Room", bedrooms=0 → "Studio" */
export function fmtHousingType(housingType: string, bedrooms: number): string {
  if (bedrooms === 0 || housingType === "studio") return "Studio";
  return housingType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** "Studio · 1 bath", "2 bed · 1 bath", "4 bed · 3 bath" */
export function fmtUnitMeta(
  housingType: string,
  bedrooms: number,
  bathrooms: number
): string {
  const isStudio = bedrooms === 0 || housingType === "studio";
  const bathStr = bathrooms === 1 ? "1 bath" : `${bathrooms} bath`;
  if (isStudio) return `Studio · ${bathStr}`;
  const bedStr = bedrooms === 1 ? "1 bed" : `${bedrooms} bed`;
  return `${bedStr} · ${bathStr}`;
}
