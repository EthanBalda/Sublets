// Constants shared by the admin dashboard.
//
// IMPORTANT: lives in a plain module, not in actions.ts. The actions file
// has `"use server"` at the top, which causes Next.js to treat every export
// as a server-action reference — non-function constants exported from a
// "use server" file lose their identity at runtime (a client `.map(...)`
// over them throws "X.map is not a function").

export const ID_VERIFICATION_OPTIONS = [
  { value: "not_started", label: "Not started" },
  { value: "pending_manual_review", label: "Pending manual review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
] as const;

export type IdVerificationStatus =
  (typeof ID_VERIFICATION_OPTIONS)[number]["value"];

export const ID_VERIFICATION_VALUES: ReadonlyArray<IdVerificationStatus> =
  ID_VERIFICATION_OPTIONS.map((o) => o.value);
