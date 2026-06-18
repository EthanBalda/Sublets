"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SUPPORTED_CAMPUS_DOMAIN } from "@/lib/campus";
import type { ProfileRole } from "@/lib/supabase/types";

export type OnboardingState = {
  status: "idle" | "error";
  error?: string;
};

const ROLE_VALUES: readonly ProfileRole[] = ["seeker", "lister", "both"];

function pickRole(value: FormDataEntryValue | null): ProfileRole | null {
  const v = String(value ?? "");
  return (ROLE_VALUES as readonly string[]).includes(v)
    ? (v as ProfileRole)
    : null;
}

function optional(value: FormDataEntryValue | null): string | null {
  const v = String(value ?? "").trim();
  return v.length > 0 ? v : null;
}

export async function submitOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", error: "Your session expired. Sign in again." };
  }

  const full_name = String(formData.get("full_name") ?? "").trim();
  const major = String(formData.get("major") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const role = pickRole(formData.get("role"));
  const gradYearRaw = String(formData.get("graduation_year") ?? "").trim();
  const graduation_year = Number.parseInt(gradYearRaw, 10);

  if (!full_name) return { status: "error", error: "Add your name." };
  if (!major) return { status: "error", error: "Add your major." };
  if (!bio) return { status: "error", error: "Add a short bio." };
  if (!role) return { status: "error", error: "Pick a role." };
  if (!Number.isFinite(graduation_year)) {
    return { status: "error", error: "Add your graduation year." };
  }

  const { data: campus, error: campusError } = await supabase
    .from("campuses")
    .select("id")
    .eq("domain_suffix", SUPPORTED_CAMPUS_DOMAIN)
    .maybeSingle();

  if (campusError || !campus) {
    return {
      status: "error",
      error: "UCSD campus is not configured in the database yet.",
    };
  }

  const { error: upsertError } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      campus_id: campus.id,
      full_name,
      major,
      graduation_year,
      bio,
      role,
      is_onboarded: true,
      verification_status: "email_verified",
      id_verification_status: "not_started",
      profile_photo_url: optional(formData.get("profile_photo_url")),
      cleanliness: optional(formData.get("cleanliness")),
      noise_level: optional(formData.get("noise_level")),
      smoking_preference: optional(formData.get("smoking_preference")),
      pets_preference: optional(formData.get("pets_preference")),
      guests_frequency: optional(formData.get("guests_frequency")),
      sleep_schedule: optional(formData.get("sleep_schedule")),
      room_sharing_preference: optional(
        formData.get("room_sharing_preference"),
      ),
      heard_from: optional(formData.get("heard_from")),
    },
    { onConflict: "user_id" },
  );

  if (upsertError) {
    return {
      status: "error",
      error: `Couldn't save your profile: ${upsertError.message}`,
    };
  }

  redirect("/explore");
}
