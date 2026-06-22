// Default checklist installed when a lister accepts an interest request.
// `key` is stored on the row so we can reason about whether all required
// items are complete without parsing display strings. All 7 are required
// for the lister to mark the request completed.

import type { InterestRequestStatus } from "@/lib/supabase/types";

export const DEFAULT_CHECKLIST_ITEMS = [
  { key: "confirm_dates", label: "Confirm dates" },
  { key: "confirm_rent", label: "Confirm rent" },
  { key: "confirm_deposit", label: "Confirm deposit" },
  { key: "confirm_roommate_approval", label: "Confirm roommate approval" },
  { key: "confirm_landlord_approval", label: "Confirm landlord approval" },
  {
    key: "confirm_agreement_signed",
    label: "Confirm agreement signed outside platform",
  },
  { key: "confirm_move_plan", label: "Confirm move-in/move-out plan" },
] as const;

export const REQUEST_STATUS_LABEL: Record<InterestRequestStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Cancelled",
  completed: "Completed",
};

export const REQUEST_STATUS_TONE: Record<InterestRequestStatus, string> = {
  pending: "bg-amber-50 text-amber-800",
  accepted: "bg-emerald-50 text-emerald-800",
  declined: "bg-zinc-100 text-zinc-700",
  cancelled: "bg-zinc-100 text-zinc-500",
  completed: "bg-blue-50 text-blue-800",
};
