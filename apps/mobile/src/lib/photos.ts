import { supabase } from "@/lib/supabase";

const BUCKET = "listing-photos";

function getPublicUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function buildFilename(localUri: string, index: number): string {
  const raw = localUri.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "jpg";
  const ext = ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(raw) ? raw : "jpg";
  return `${index}-${Date.now()}.${ext}`;
}

async function uploadPhoto(localUri: string, path: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const contentType = blob.type || "image/jpeg";

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return getPublicUrl(path);
}

/**
 * Given a mixed list of local URIs and already-uploaded https:// URLs,
 * uploads the local ones and returns a fully-resolved URL array in the same order.
 * authUid = session.user.id (matches auth.uid() in storage policies).
 */
export async function resolvePhotos(
  uris: string[],
  listingId: string,
  authUid: string
): Promise<string[]> {
  const results: string[] = [];
  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    if (uri.startsWith("https://")) {
      results.push(uri);
    } else {
      const filename = buildFilename(uri, i);
      const path = `${authUid}/${listingId}/${filename}`;
      results.push(await uploadPhoto(uri, path));
    }
  }
  return results;
}

/** Mirrors web's replacePhotos(): delete all rows then re-insert sorted. */
export async function replaceListingPhotos(
  listingId: string,
  urls: string[]
): Promise<void> {
  const { error: delErr } = await supabase
    .from("listing_photos")
    .delete()
    .eq("listing_id", listingId);
  if (delErr) throw new Error(`listing_photos delete failed: ${delErr.message}`);
  if (urls.length === 0) return;

  const { error } = await supabase.from("listing_photos").insert(
    urls.map((storage_url, sort_order) => ({
      listing_id: listingId,
      storage_url,
      sort_order,
    }))
  );
  if (error) throw new Error(`listing_photos insert failed: ${error.message}`);
}

/** Fetches existing photo URLs for a listing, sorted by sort_order. */
export async function getListingPhotos(listingId: string): Promise<string[]> {
  const { data } = await supabase
    .from("listing_photos")
    .select("storage_url, sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });
  return (data ?? []).map((p) => p.storage_url);
}
