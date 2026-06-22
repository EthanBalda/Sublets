"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOnboardedUser } from "@/lib/auth/session";
import { track } from "@/lib/analytics/track";
import type {
  ListingStatus,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/lib/supabase/types";

export type ListingFormState = {
  status: "idle" | "error";
  error?: string;
  fieldErrors?: Record<string, string>;
};

const ALLOWED_TARGET_STATUSES: ReadonlyArray<ListingStatus> = [
  "draft",
  "published",
  "paused",
  "filled",
];

// -----------------------------------------------------------------------
// Parsing
// -----------------------------------------------------------------------

type RawListing = {
  title: string;
  housing_type: string;
  monthly_rent: number;
  security_deposit: number | null;
  utilities_included: string;
  available_start_date: string;
  available_end_date: string;
  address_private: string | null;
  neighborhood: string;
  distance_to_campus: string | null;
  bedrooms: number;
  bathrooms: number;
  total_roommates: number | null;
  room_sharing_required: boolean;
  parking_available: boolean;
  laundry_available: boolean;
  furnished: boolean;
  pets_allowed: boolean;
  appliances: string[];
  description: string;
  lease_status: string;
  photo_urls: string[];
};

function checkbox(v: FormDataEntryValue | null): boolean {
  return v === "on" || v === "true";
}

function text(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

function optionalText(v: FormDataEntryValue | null): string | null {
  const s = text(v);
  return s.length > 0 ? s : null;
}

function intOrZero(v: FormDataEntryValue | null): number {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function optionalInt(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s.length === 0) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function numericOrZero(v: FormDataEntryValue | null): number {
  const n = Number.parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function parseRawListing(formData: FormData): RawListing {
  return {
    title: text(formData.get("title")),
    housing_type: text(formData.get("housing_type")),
    monthly_rent: intOrZero(formData.get("monthly_rent")),
    security_deposit: optionalInt(formData.get("security_deposit")),
    utilities_included: text(formData.get("utilities_included")),
    available_start_date: text(formData.get("available_start_date")),
    available_end_date: text(formData.get("available_end_date")),
    address_private: optionalText(formData.get("address_private")),
    neighborhood: text(formData.get("neighborhood")),
    distance_to_campus: optionalText(formData.get("distance_to_campus")),
    bedrooms: numericOrZero(formData.get("bedrooms")),
    bathrooms: numericOrZero(formData.get("bathrooms")),
    total_roommates: optionalInt(formData.get("total_roommates")),
    room_sharing_required: checkbox(formData.get("room_sharing_required")),
    parking_available: checkbox(formData.get("parking_available")),
    laundry_available: checkbox(formData.get("laundry_available")),
    furnished: checkbox(formData.get("furnished")),
    pets_allowed: checkbox(formData.get("pets_allowed")),
    appliances: formData.getAll("appliances").map(String),
    description: text(formData.get("description")),
    lease_status: text(formData.get("lease_status")),
    photo_urls: text(formData.get("photo_urls"))
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

// -----------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------

function validateForPublish(raw: RawListing): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!raw.title) errors.title = "Add a title.";
  if (!raw.housing_type) errors.housing_type = "Pick a housing type.";
  if (raw.monthly_rent <= 0)
    errors.monthly_rent = "Enter a monthly rent greater than 0.";
  if (!raw.utilities_included)
    errors.utilities_included = "Pick a utilities option.";
  if (!raw.available_start_date)
    errors.available_start_date = "Add a start date.";
  if (!raw.available_end_date) errors.available_end_date = "Add an end date.";
  if (
    raw.available_start_date &&
    raw.available_end_date &&
    raw.available_start_date >= raw.available_end_date
  ) {
    errors.available_end_date = "End date must be after start date.";
  }
  if (!raw.neighborhood) errors.neighborhood = "Add a neighborhood.";
  if (raw.bedrooms < 0) errors.bedrooms = "Bedrooms must be 0 or more.";
  if (raw.bathrooms <= 0) errors.bathrooms = "Add the number of bathrooms.";
  if (!raw.description) errors.description = "Add a description.";
  if (!raw.lease_status) errors.lease_status = "Pick a lease status.";
  return errors;
}

// Same checks as validateForPublish, but takes a persisted listings row so
// the dashboard's "Publish" button can re-validate without going through
// the form.
function validateForPublishRow(
  row: Tables<"listings">,
): Record<string, string> {
  return validateForPublish({ ...row, photo_urls: [] });
}

// For drafts the schema still requires several NOT NULL columns, so we
// supply harmless defaults for anything the user left blank. The form
// validates again before publish.
function coerceForDraft(raw: RawListing): RawListing {
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...raw,
    title: raw.title || "Untitled listing",
    housing_type: raw.housing_type || "other",
    utilities_included: raw.utilities_included || "ask_lister",
    available_start_date: raw.available_start_date || today,
    available_end_date: raw.available_end_date || today,
    neighborhood: raw.neighborhood || "—",
    description: raw.description || "",
    lease_status: raw.lease_status || "unknown",
  };
}

// -----------------------------------------------------------------------
// Mutations
// -----------------------------------------------------------------------

async function getUcsdCampusId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("campuses")
    .select("id")
    .eq("domain_suffix", "ucsd.edu")
    .maybeSingle();
  return data?.id ?? null;
}

async function replacePhotos(listingId: string, urls: string[]): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.from("listing_photos").delete().eq("listing_id", listingId);
  if (urls.length === 0) return;
  await supabase.from("listing_photos").insert(
    urls.map((url, i) => ({
      listing_id: listingId,
      storage_url: url,
      sort_order: i,
    })),
  );
}

export async function createListing(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const session = await requireOnboardedUser();
  const mode = formData.get("mode") === "publish" ? "publish" : "draft";
  const raw = parseRawListing(formData);

  if (mode === "publish") {
    const fieldErrors = validateForPublish(raw);
    if (Object.keys(fieldErrors).length > 0) {
      return {
        status: "error",
        fieldErrors,
        error: "Fix the highlighted fields, then publish.",
      };
    }
  }

  const campusId = await getUcsdCampusId();
  if (!campusId) {
    return {
      status: "error",
      error: "UCSD campus is missing from the database. Re-run the seed.",
    };
  }

  const values = mode === "publish" ? raw : coerceForDraft(raw);
  const insert: TablesInsert<"listings"> = {
    owner_id: session.profile.id,
    campus_id: campusId,
    title: values.title,
    housing_type: values.housing_type,
    monthly_rent: values.monthly_rent,
    security_deposit: values.security_deposit,
    utilities_included: values.utilities_included,
    available_start_date: values.available_start_date,
    available_end_date: values.available_end_date,
    address_private: values.address_private,
    neighborhood: values.neighborhood,
    distance_to_campus: values.distance_to_campus,
    bedrooms: values.bedrooms,
    bathrooms: values.bathrooms,
    total_roommates: values.total_roommates,
    room_sharing_required: values.room_sharing_required,
    parking_available: values.parking_available,
    laundry_available: values.laundry_available,
    furnished: values.furnished,
    pets_allowed: values.pets_allowed,
    appliances: values.appliances,
    description: values.description,
    lease_status: values.lease_status,
    status: mode === "publish" ? "published" : "draft",
  };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("listings")
    .insert(insert)
    .select("id, status")
    .single();

  if (error || !data) {
    return {
      status: "error",
      error: error?.message ?? "Couldn't create the listing.",
    };
  }

  await replacePhotos(data.id, values.photo_urls);
  await track("listing_created", {
    listing_id: data.id,
    campus_id: campusId,
    mode,
  });
  if (data.status === "published") {
    await track("listing_published", {
      listing_id: data.id,
      campus_id: campusId,
      source: "create",
    });
  }
  revalidatePath("/dashboard");
  revalidatePath(`/listings/${data.id}`);

  redirect(data.status === "published" ? `/listings/${data.id}` : "/dashboard");
}

export async function updateListing(
  listingId: string,
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const session = await requireOnboardedUser();
  const mode = formData.get("mode") === "publish" ? "publish" : "draft";
  const raw = parseRawListing(formData);

  // Need the current status before we know whether to validate or coerce.
  // Edits to a non-draft listing always validate — anything else risks
  // overwriting live content with coerced defaults like "Untitled listing".
  const supabase = await createSupabaseServerClient();
  const { data: current } = await supabase
    .from("listings")
    .select("status")
    .eq("id", listingId)
    .eq("owner_id", session.profile.id)
    .maybeSingle();

  if (!current) {
    return {
      status: "error",
      error: "Listing not found — it may have been removed.",
    };
  }

  const isDraft = current.status === "draft";
  const requireValidation = !isDraft || mode === "publish";

  if (requireValidation) {
    const fieldErrors = validateForPublish(raw);
    if (Object.keys(fieldErrors).length > 0) {
      return {
        status: "error",
        fieldErrors,
        error: isDraft
          ? "Fix the highlighted fields, then publish."
          : "Fix the highlighted fields before saving — this listing is live.",
      };
    }
  }

  const values = requireValidation ? raw : coerceForDraft(raw);

  // Status only changes here when a draft is being published. Other
  // transitions (pause, fill, re-publish) live on the dashboard.
  const newStatus: ListingStatus | undefined =
    isDraft && mode === "publish" ? "published" : undefined;

  const update: TablesUpdate<"listings"> = {
    title: values.title,
    housing_type: values.housing_type,
    monthly_rent: values.monthly_rent,
    security_deposit: values.security_deposit,
    utilities_included: values.utilities_included,
    available_start_date: values.available_start_date,
    available_end_date: values.available_end_date,
    address_private: values.address_private,
    neighborhood: values.neighborhood,
    distance_to_campus: values.distance_to_campus,
    bedrooms: values.bedrooms,
    bathrooms: values.bathrooms,
    total_roommates: values.total_roommates,
    room_sharing_required: values.room_sharing_required,
    parking_available: values.parking_available,
    laundry_available: values.laundry_available,
    furnished: values.furnished,
    pets_allowed: values.pets_allowed,
    appliances: values.appliances,
    description: values.description,
    lease_status: values.lease_status,
    status: newStatus,
  };

  const { data, error } = await supabase
    .from("listings")
    .update(update)
    .eq("id", listingId)
    .eq("owner_id", session.profile.id)
    .select("id, status")
    .single();

  if (error || !data) {
    return {
      status: "error",
      error:
        error?.message ?? "Couldn't update the listing — does it still exist?",
    };
  }

  await replacePhotos(listingId, values.photo_urls);
  if (newStatus === "published") {
    await track("listing_published", {
      listing_id: listingId,
      source: "edit",
    });
  }
  revalidatePath("/dashboard");
  revalidatePath(`/listings/${listingId}`);

  redirect(data.status === "published" ? `/listings/${listingId}` : "/dashboard");
}

// Lifecycle transitions: publish, pause, mark filled, revert to draft.
// Allowed targets are a deliberately narrow subset of ListingStatus.
//
// Publishing (and re-publishing) re-runs validation against the persisted
// row so a draft with missing required fields can't be flipped to published
// straight from the dashboard. Errors surface as thrown exceptions; the
// dashboard wraps these in per-row forms so the default Next error UI takes
// over (good enough for v1, replace with toasts later).
export async function changeListingStatus(
  listingId: string,
  target: ListingStatus,
): Promise<void> {
  if (!ALLOWED_TARGET_STATUSES.includes(target)) {
    throw new Error(`Refusing to transition listing to ${target}.`);
  }
  const session = await requireOnboardedUser();
  const supabase = await createSupabaseServerClient();

  if (target === "published") {
    const { data: row } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .eq("owner_id", session.profile.id)
      .maybeSingle();
    if (!row) throw new Error("Listing not found.");
    const errors = validateForPublishRow(row);
    if (Object.keys(errors).length > 0) {
      throw new Error(
        "This listing has missing required fields. Open Edit to complete it before publishing.",
      );
    }
  }

  const patch: TablesUpdate<"listings"> = { status: target };
  if (target === "filled") {
    patch.filled_at = new Date().toISOString();
  }
  if (target === "published") {
    // Clear the filled timestamp so re-published rows aren't stuck looking
    // historically filled in audits.
    patch.filled_at = null;
  }

  const { error } = await supabase
    .from("listings")
    .update(patch)
    .eq("id", listingId)
    .eq("owner_id", session.profile.id);
  if (error) throw error;

  if (target === "published") {
    await track("listing_published", {
      listing_id: listingId,
      source: "status_change",
    });
  } else if (target === "filled") {
    await track("listing_marked_filled", {
      listing_id: listingId,
      source: "status_change",
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/listings/${listingId}`);
}

// Hard delete — restricted to drafts in the UI; we re-check on the server
// to keep this action safe to call directly.
export async function deleteListing(listingId: string): Promise<void> {
  const session = await requireOnboardedUser();
  const supabase = await createSupabaseServerClient();
  const { data: row, error: lookupError } = await supabase
    .from("listings")
    .select("status, owner_id")
    .eq("id", listingId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!row || row.owner_id !== session.profile.id) {
    throw new Error("Listing not found.");
  }
  if (row.status !== "draft") {
    throw new Error("Only drafts can be deleted. Pause or mark as filled instead.");
  }
  const { error } = await supabase
    .from("listings")
    .delete()
    .eq("id", listingId)
    .eq("owner_id", session.profile.id);
  if (error) throw error;
  revalidatePath("/dashboard");
}
