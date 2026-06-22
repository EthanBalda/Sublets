// Sublets v1 is UCSD-only. Anyone else lands on the waitlist.
//
// classifyEmail() is intentionally permissive about case + whitespace because
// it runs against raw form input. Domain comparison is suffix-based so users
// at "math.ucsd.edu" still resolve as UCSD.

export const SUPPORTED_CAMPUS_DOMAIN = "ucsd.edu";

export type EmailKind = "ucsd" | "other_edu" | "non_edu" | "invalid";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function classifyEmail(rawEmail: string): EmailKind {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return "invalid";

  const domain = email.split("@")[1];
  if (!domain) return "invalid";

  if (domain === SUPPORTED_CAMPUS_DOMAIN || domain.endsWith(`.${SUPPORTED_CAMPUS_DOMAIN}`)) {
    return "ucsd";
  }
  if (domain === "edu" || domain.endsWith(".edu")) {
    return "other_edu";
  }
  return "non_edu";
}
