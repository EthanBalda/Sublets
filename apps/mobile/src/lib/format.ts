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

/** "Jun 1" — short date without year */
export function fmtDateShort(s: string | null | undefined): string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const [y, mo, d] = s.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** "Jun 1 – Aug 15" or "" if both missing */
export function fmtDateRange(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  const s = fmtDateShort(start);
  const e = fmtDateShort(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return `From ${s}`;
  if (e) return `Until ${e}`;
  return "";
}
