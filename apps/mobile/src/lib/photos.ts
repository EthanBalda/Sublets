import { supabase } from "@/lib/supabase";

const BUCKET = "listing-photos";

function getPublicUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Extract the storage object path from a public URL so we can delete it.
// The marker `/storage/v1/object/public/<bucket>/` is stable across projects.
function extractStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

// Infer content type from the URI's file extension.
// expo-image-picker always returns a file:// URI so extension is reliable.
function inferContentType(uri: string): string {
  const ext = uri.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
  };
  return map[ext] ?? "image/jpeg";
}

function buildFilename(localUri: string, index: number): string {
  const raw = localUri.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "jpg";
  const ext = ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(raw) ? raw : "jpg";
  // Timestamp suffix avoids stale-cache collisions between edits.
  return `${index}-${Date.now()}.${ext}`;
}

async function uploadPhoto(localUri: string, path: string): Promise<string> {
  const contentType = inferContentType(localUri);

  // Use arrayBuffer() instead of blob(). React Native's Blob polyfill can
  // silently produce an empty or unreadable body when passed to Supabase's
  // upload — arrayBuffer is a native Web API that works correctly.
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  if (arrayBuffer.byteLength === 0) {
    throw new Error(
      "Photo file read as empty — the local URI may be invalid or inaccessible."
    );
  }

  const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
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

/**
 * Replace all listing_photos rows for a listing, deleting removed storage
 * objects from the bucket so orphaned files don't accumulate.
 */
export async function replaceListingPhotos(
  listingId: string,
  urls: string[]
): Promise<void> {
  // Fetch existing URLs before deleting rows so we can clean up storage objects.
  const { data: existing } = await supabase
    .from("listing_photos")
    .select("storage_url")
    .eq("listing_id", listingId);

  const newUrlSet = new Set(urls);
  const pathsToDelete = (existing ?? [])
    .map((r) => r.storage_url)
    .filter((url) => !newUrlSet.has(url))
    .map(extractStoragePath)
    .filter((p): p is string => p !== null);

  // Delete storage objects that are no longer referenced. Non-fatal if partial.
  if (pathsToDelete.length > 0) {
    const { error: storageErr } = await supabase.storage
      .from(BUCKET)
      .remove(pathsToDelete);
    if (storageErr && __DEV__) {
      console.warn("[photos] storage cleanup partial failure:", storageErr.message);
    }
  }

  // Replace DB rows.
  const { error: delErr } = await supabase
    .from("listing_photos")
    .delete()
    .eq("listing_id", listingId);
  if (delErr) throw new Error(`listing_photos delete failed: ${delErr.message}`);
  if (urls.length === 0) return;

  const rows = urls.map((storage_url, sort_order) => ({
    listing_id: listingId,
    storage_url,
    sort_order,
  }));

  const { error } = await supabase.from("listing_photos").insert(rows);
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
