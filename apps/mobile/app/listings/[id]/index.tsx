import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { getListingWithPhotos, type ListingWithPhotos } from "@/lib/listings";
import { supabase } from "@/lib/supabase";
import ListingPhotoCarousel from "@/components/ListingPhotoCarousel";
import { HOUSING_TYPES, UTILITIES_INCLUDED, LEASE_STATUSES, labelFor, LISTING_STATUS_LABEL } from "@sublets/shared/constants";
import type { Tables } from "@sublets/shared/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function fmtDate(s: string | null | undefined): string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return "—";
  const [y, mo, d] = s.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type OwnerProfile = Pick<
  Tables<"profiles">,
  "id" | "full_name" | "major" | "graduation_year"
>;

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [listing, setListing] = useState<ListingWithPhotos | null>(null);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [hasRequested, setHasRequested] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const load = useCallback(async () => {
    if (!id || !profile) return;
    setFetching(true);
    setFetchError(null);

    try {
      const [listingData, reqData] = await Promise.all([
        getListingWithPhotos(id),
        supabase
          .from("interest_requests")
          .select("id")
          .eq("listing_id", id)
          .eq("seeker_id", profile.id)
          .in("status", ["pending", "accepted"])
          .maybeSingle(),
      ]);

      if (!listingData) {
        setFetchError("Listing not found.");
        return;
      }

      setListing(listingData);
      setHasRequested(!!reqData.data);

      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("id, full_name, major, graduation_year")
        .eq("id", listingData.owner_id)
        .maybeSingle();

      setOwner(ownerProfile ?? null);
    } catch (e: unknown) {
      setFetchError(e instanceof Error ? e.message : "Couldn't load listing.");
    } finally {
      setFetching(false);
    }
  }, [id, profile]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function handleRequest() {
    if (!profile || !listing || requesting) return;
    setRequesting(true);
    const { error } = await supabase.from("interest_requests").insert({
      listing_id: listing.id,
      seeker_id: profile.id,
      lister_id: listing.owner_id,
      status: "pending",
    });
    setRequesting(false);
    if (!error || error.code === "23505") {
      setHasRequested(true);
    } else {
      Alert.alert("Couldn't send request", error.message);
    }
  }

  if (fetching) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  if (fetchError || !listing) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{fetchError ?? "Not found."}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isOwner = profile?.id === listing.owner_id;
  const canRequest =
    !isOwner && listing.status === "published" && !hasRequested;

  const sortedPhotos = listing.listing_photos
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => p.storage_url);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>← Back</Text>
        </Pressable>
        {isOwner && (
          <View style={[styles.statusBadge, { backgroundColor: "#f3f4f6" }]}>
            <Text style={[styles.statusBadgeText, { color: "#374151" }]}>
              {LISTING_STATUS_LABEL[listing.status]}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo carousel with story-style bar indicators */}
        <ListingPhotoCarousel
          photos={sortedPhotos}
          height={300}
          width={SCREEN_WIDTH}
          fallbackLabel="No photos"
          showBars
        />

        {/* Core info */}
        <View style={styles.infoBlock}>
          <Text style={styles.rent}>${listing.monthly_rent}/mo</Text>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.meta}>
            {listing.neighborhood} · {labelFor(HOUSING_TYPES, listing.housing_type)}
          </Text>
          <Text style={styles.meta2}>
            {listing.bedrooms} bd · {listing.bathrooms} ba
          </Text>
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Availability</Text>
          <Text style={styles.sectionBody}>
            {fmtDate(listing.available_start_date)} → {fmtDate(listing.available_end_date)}
          </Text>
        </View>

        {/* Utilities & lease */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Utilities</Text>
          <Text style={styles.sectionBody}>
            {labelFor(UTILITIES_INCLUDED, listing.utilities_included)}
          </Text>
          {listing.security_deposit != null && (
            <Text style={styles.sectionBody}>
              Security deposit: ${listing.security_deposit}
            </Text>
          )}
          <Text style={styles.sectionBody}>
            Lease: {labelFor(LEASE_STATUSES, listing.lease_status)}
          </Text>
        </View>

        {/* Amenities */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Amenities</Text>
          <View style={styles.chips}>
            {listing.parking_available && <View style={styles.chip}><Text style={styles.chipText}>Parking</Text></View>}
            {listing.laundry_available && <View style={styles.chip}><Text style={styles.chipText}>Laundry</Text></View>}
            {listing.furnished && <View style={styles.chip}><Text style={styles.chipText}>Furnished</Text></View>}
            {listing.pets_allowed && <View style={styles.chip}><Text style={styles.chipText}>Pets OK</Text></View>}
          </View>
        </View>

        {/* Description */}
        {listing.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>About this space</Text>
            <Text style={styles.descriptionText}>{listing.description}</Text>
          </View>
        ) : null}

        {/* Lister info */}
        {owner && !isOwner && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Listed by</Text>
            <Text style={styles.ownerName}>{owner.full_name}</Text>
            {owner.major && owner.graduation_year ? (
              <Text style={styles.ownerMeta}>
                {owner.major} · Class of {owner.graduation_year}
              </Text>
            ) : null}
          </View>
        )}

        {/* Actions */}
        {isOwner ? (
          <Pressable
            style={styles.editBtn}
            onPress={() =>
              router.push(`/listings/${listing.id}/edit` as Parameters<typeof router.push>[0])
            }
          >
            <Text style={styles.editBtnText}>Edit Listing</Text>
          </Pressable>
        ) : canRequest ? (
          <Pressable
            style={[styles.requestBtn, requesting && styles.btnDisabled]}
            onPress={() => void handleRequest()}
            disabled={requesting}
          >
            {requesting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.requestBtnText}>Send Request</Text>
            )}
          </Pressable>
        ) : hasRequested ? (
          <View style={styles.requestedNote}>
            <Text style={styles.requestedNoteText}>Request sent</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 32,
  },
  scroll: { flex: 1 },
  content: { gap: 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  headerBack: { padding: 4, minWidth: 60 },
  headerBackText: { fontSize: 15, color: "#208AEF", fontWeight: "600" },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: "600" },
  infoBlock: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 4,
  },
  rent: { fontSize: 26, fontWeight: "800", color: "#208AEF" },
  title: { fontSize: 20, fontWeight: "700", color: "#1a1a1a" },
  meta: { fontSize: 15, color: "#555" },
  meta2: { fontSize: 14, color: "#888" },
  section: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionBody: { fontSize: 15, color: "#333" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: {
    backgroundColor: "#f0f4ff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipText: { fontSize: 13, color: "#208AEF", fontWeight: "600" },
  descriptionText: { fontSize: 15, color: "#333", lineHeight: 22 },
  ownerName: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  ownerMeta: { fontSize: 14, color: "#666" },
  requestBtn: {
    backgroundColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    margin: 20,
  },
  requestBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  editBtn: {
    borderWidth: 2,
    borderColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    margin: 20,
  },
  editBtnText: { color: "#208AEF", fontSize: 16, fontWeight: "700" },
  requestedNote: {
    backgroundColor: "#d1fae5",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    margin: 20,
  },
  requestedNoteText: { color: "#065f46", fontSize: 15, fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },
  errorText: { fontSize: 15, color: "#dc2626", textAlign: "center" },
  backBtn: {
    backgroundColor: "#208AEF",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  backBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
