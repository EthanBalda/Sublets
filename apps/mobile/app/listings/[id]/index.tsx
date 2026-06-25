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
import {
  HOUSING_TYPES,
  UTILITIES_INCLUDED,
  LEASE_STATUSES,
  labelFor,
  LISTING_STATUS_LABEL,
} from "@sublets/shared/constants";
import { fmtUnitMeta, fmtDateRange } from "@/lib/format";
import type { Tables } from "@sublets/shared/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  draft: { bg: "#f3f4f6", text: "#374151" },
  published: { bg: "#d1fae5", text: "#065f46" },
  paused: { bg: "#fef3c7", text: "#92400e" },
  filled: { bg: "#dbeafe", text: "#1e40af" },
  expired: { bg: "#fee2e2", text: "#991b1b" },
  removed: { bg: "#f3f4f6", text: "#6b7280" },
};

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
  const canRequest = !isOwner && listing.status === "published" && !hasRequested;
  const sc = STATUS_COLOR[listing.status] ?? STATUS_COLOR.draft;
  const dateRange = fmtDateRange(listing.available_start_date, listing.available_end_date);
  const showActionBar = isOwner || canRequest || hasRequested;
  const hasAmenities =
    listing.parking_available ||
    listing.laundry_available ||
    listing.furnished ||
    listing.pets_allowed;

  const sortedPhotos = listing.listing_photos
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => p.storage_url);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Navigation header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>← Back</Text>
        </Pressable>
        {isOwner && (
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusBadgeText, { color: sc.text }]}>
              {LISTING_STATUS_LABEL[listing.status]}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingBottom: showActionBar ? 96 : insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero photo carousel */}
        <ListingPhotoCarousel
          photos={sortedPhotos}
          height={300}
          width={SCREEN_WIDTH}
          showBars
        />

        {/* Core info block */}
        <View style={styles.infoBlock}>
          <Text style={styles.rent}>${listing.monthly_rent}/mo</Text>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.metaLine}>
            {labelFor(HOUSING_TYPES, listing.housing_type)} in {listing.neighborhood}
          </Text>
          <Text style={styles.metaLine2}>
            {fmtUnitMeta(listing.housing_type, listing.bedrooms, listing.bathrooms)}
            {dateRange ? `  ·  ${dateRange}` : ""}
          </Text>
        </View>

        {/* Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Availability</Text>
          <Text style={styles.sectionBody}>
            {fmtDate(listing.available_start_date)} → {fmtDate(listing.available_end_date)}
          </Text>
        </View>

        {/* Details: utilities + lease + deposit */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Utilities</Text>
            <Text style={styles.detailValue}>
              {labelFor(UTILITIES_INCLUDED, listing.utilities_included)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Lease</Text>
            <Text style={styles.detailValue}>
              {labelFor(LEASE_STATUSES, listing.lease_status)}
            </Text>
          </View>
          {listing.security_deposit != null && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Security deposit</Text>
              <Text style={styles.detailValue}>${listing.security_deposit}</Text>
            </View>
          )}
        </View>

        {/* Amenities — only if at least one is set */}
        {hasAmenities ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Amenities</Text>
            <View style={styles.chips}>
              {listing.parking_available && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>Parking</Text>
                </View>
              )}
              {listing.laundry_available && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>Laundry</Text>
                </View>
              )}
              {listing.furnished && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>Furnished</Text>
                </View>
              )}
              {listing.pets_allowed && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>Pets OK</Text>
                </View>
              )}
            </View>
          </View>
        ) : null}

        {/* Description — always shown, fallback when empty */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description</Text>
          {listing.description ? (
            <Text style={styles.descriptionText}>{listing.description}</Text>
          ) : (
            <Text style={styles.descriptionEmpty}>No description provided.</Text>
          )}
        </View>

        {/* Lister info — seekers only, fallback if profile not available */}
        {!isOwner && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Listed by</Text>
            {owner ? (
              <>
                <Text style={styles.ownerName}>{owner.full_name}</Text>
                {owner.major && owner.graduation_year ? (
                  <Text style={styles.ownerMeta}>
                    {owner.major} · Class of {owner.graduation_year}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.ownerFallback}>Posted by a UCSD student</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Sticky action bar — only rendered when there is an action */}
      {showActionBar && (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 8 }]}>
          {isOwner ? (
            <Pressable
              style={styles.editBtn}
              onPress={() =>
                router.push(
                  `/listings/${listing.id}/edit` as Parameters<typeof router.push>[0]
                )
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
              <Text style={styles.requestedNoteText}>{"✓ Request sent"}</Text>
            </View>
          ) : null}
        </View>
      )}
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
  rent: { fontSize: 28, fontWeight: "800", color: "#208AEF" },
  title: { fontSize: 20, fontWeight: "700", color: "#1a1a1a", marginTop: 2 },
  metaLine: { fontSize: 15, color: "#555", marginTop: 4 },
  metaLine2: { fontSize: 13, color: "#888" },
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
    marginBottom: 6,
  },
  sectionBody: { fontSize: 15, color: "#333" },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 5,
  },
  detailLabel: { fontSize: 14, color: "#666" },
  detailValue: {
    fontSize: 14,
    color: "#1a1a1a",
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
    marginLeft: 16,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#f0f4ff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipText: { fontSize: 13, color: "#208AEF", fontWeight: "600" },
  descriptionText: { fontSize: 15, color: "#333", lineHeight: 22 },
  descriptionEmpty: { fontSize: 14, color: "#aaa", fontStyle: "italic" },
  ownerName: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  ownerMeta: { fontSize: 14, color: "#666" },
  ownerFallback: { fontSize: 14, color: "#888" },
  actionBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  requestBtn: {
    backgroundColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  requestBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  editBtn: {
    borderWidth: 2,
    borderColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  editBtnText: { color: "#208AEF", fontSize: 16, fontWeight: "700" },
  requestedNote: {
    backgroundColor: "#d1fae5",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
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
