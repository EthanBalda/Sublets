import type { ReportStatus } from "@/lib/supabase/types";

export const REPORT_REASONS = [
  { value: "scam_suspicion", label: "Scam suspicion" },
  { value: "inaccurate_listing", label: "Inaccurate listing" },
  { value: "harassment", label: "Harassment" },
  { value: "duplicate_listing", label: "Duplicate listing" },
  { value: "no_longer_available", label: "No longer available" },
  { value: "other", label: "Other" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export const REPORT_REASON_VALUES = REPORT_REASONS.map((r) => r.value) as
  ReadonlyArray<ReportReason>;

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  open: "Open",
  reviewing: "Reviewing",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export const REPORT_STATUS_TONE: Record<ReportStatus, string> = {
  open: "bg-amber-50 text-amber-800",
  reviewing: "bg-blue-50 text-blue-800",
  resolved: "bg-emerald-50 text-emerald-800",
  dismissed: "bg-zinc-100 text-zinc-600",
};

export function labelForReason(value: string): string {
  return REPORT_REASONS.find((r) => r.value === value)?.label ?? value;
}
