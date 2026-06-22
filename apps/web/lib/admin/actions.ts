"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth/session";
import {
  ID_VERIFICATION_VALUES,
  type IdVerificationStatus,
} from "@/lib/admin/constants";
import type { ReportStatus } from "@/lib/supabase/types";

const ALLOWED_REPORT_TRANSITIONS: ReadonlyArray<ReportStatus> = [
  "open",
  "reviewing",
  "resolved",
  "dismissed",
];

function isIdVerificationStatus(v: string): v is IdVerificationStatus {
  return (ID_VERIFICATION_VALUES as readonly string[]).includes(v);
}

// ---------- Reports ----------

export async function updateReportStatus(
  reportId: string,
  next: ReportStatus,
): Promise<void> {
  if (!ALLOWED_REPORT_TRANSITIONS.includes(next)) {
    throw new Error(`Refusing to set report status to ${next}.`);
  }
  await requireAdminUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("reports")
    .update({ status: next })
    .eq("id", reportId);
  if (error) throw error;
  revalidatePath("/admin");
}

export async function updateReportNotes(
  reportId: string,
  formData: FormData,
): Promise<void> {
  await requireAdminUser();
  const notes = String(formData.get("notes") ?? "").trim();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("reports")
    .update({ admin_notes: notes.length > 0 ? notes : null })
    .eq("id", reportId);
  if (error) throw error;
  revalidatePath("/admin");
}

// ---------- Listings ----------

// Removing a listing flips status to 'removed'. Restoring sends it to
// 'paused' (NOT 'published') per spec, so the owner re-publishes after
// reviewing the issue that got the listing reported.
export async function removeListing(listingId: string): Promise<void> {
  await requireAdminUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("listings")
    .update({ status: "removed" })
    .eq("id", listingId);
  if (error) throw error;
  revalidatePath("/admin");
  revalidatePath("/explore");
  revalidatePath(`/listings/${listingId}`);
}

export async function restoreListing(listingId: string): Promise<void> {
  await requireAdminUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("listings")
    .update({ status: "paused" })
    .eq("id", listingId);
  if (error) throw error;
  revalidatePath("/admin");
  revalidatePath("/explore");
  revalidatePath(`/listings/${listingId}`);
}

// ---------- Users ----------

export async function setUserSuspension(
  profileId: string,
  suspended: boolean,
): Promise<void> {
  const session = await requireAdminUser();
  if (profileId === session.profile.id) {
    // Suspending yourself is almost certainly an accident — block it so an
    // admin can't lock themselves out via the UI. SQL access can still flip
    // the flag deliberately.
    throw new Error("You can't suspend your own account.");
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_suspended: suspended })
    .eq("id", profileId);
  if (error) throw error;
  revalidatePath("/admin");
}

// Sublets does NOT collect or upload IDs. This is purely manual status
// tracking so admins can record what they verified out-of-band.
export async function setIdVerificationStatus(
  profileId: string,
  next: string,
): Promise<void> {
  if (!isIdVerificationStatus(next)) {
    throw new Error(`Refusing to set id_verification_status to ${next}.`);
  }
  await requireAdminUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ id_verification_status: next })
    .eq("id", profileId);
  if (error) throw error;
  revalidatePath("/admin");
}
