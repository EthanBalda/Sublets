import { useRef, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { fmtHousingType, fmtUnitMeta } from "@/lib/format";
import type { Tables } from "@sublets/shared/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;

type ListingWithPhotos = Tables<"listings"> & {
  listing_photos: Pick<Tables<"listing_photos">, "storage_url" | "sort_order">[];
};

function fmtDateShort(s: string | null | undefined): string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const [y, mo, d] = s.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}


function SwipeCard({
  listing,
  translateX,
  translateY,
  disabled,
  onPass,
  onRequest,
  onTapDetail,
}: {
  listing: ListingWithPhotos;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  disabled: boolean;
  onPass: () => void;
  onRequest: () => void;
  onTapDetail: () => void;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);

  const sortedPhotos = listing.listing_photos
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => p.storage_url);

  const photo = sortedPhotos[photoIndex] ?? null;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${(translateX.value / SCREEN_WIDTH) * 15}deg` },
    ],
  }));

  // Overlay labels fade in as the card is dragged in each direction.
  const requestOverlayStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, translateX.value / 60)),
  }));
  const passOverlayStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, -translateX.value / 60)),
  }));

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.3;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, { damping: 15 });
        runOnJS(onRequest)();
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, { damping: 15 });
        runOnJS(onPass)();
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const startDate = fmtDateShort(listing.available_start_date);
  const endDate = fmtDateShort(listing.available_end_date);
  const dateRange = startDate && endDate ? `${startDate} – ${endDate}` : "";

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, animatedStyle]}>
        {/* REQUEST label — fades in when dragging right */}
        <Animated.View
          style={[styles.overlayLabel, styles.overlayRequest, requestOverlayStyle]}
          pointerEvents="none"
        >
          <Text style={styles.overlayRequestText}>REQUEST</Text>
        </Animated.View>

        {/* PASS label — fades in when dragging left */}
        <Animated.View
          style={[styles.overlayLabel, styles.overlayPass, passOverlayStyle]}
          pointerEvents="none"
        >
          <Text style={styles.overlayPassText}>PASS</Text>
        </Animated.View>

        {/* Photo with tap-left / tap-right zones */}
        <View style={styles.photoContainer}>
          {photo ? (
            <Image
              source={{ uri: photo }}
              style={styles.photo}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Ionicons name="image-outline" size={44} color="#b8c8e0" />
              <Text style={styles.photoPlaceholderText}>No photos yet</Text>
            </View>
          )}

          {/* Progress bars always rendered when there are photos */}
          {sortedPhotos.length > 1 && (
            <View style={styles.photoBars} pointerEvents="none">
              {sortedPhotos.map((_, i) => (
                <View
                  key={i}
                  style={[styles.photoBar, i === photoIndex && styles.photoBarActive]}
                />
              ))}
            </View>
          )}

          {/* Tap zones: narrow edges cycle photos; center opens detail */}
          <Pressable
            style={[styles.tapZone, styles.tapZoneLeft]}
            onPress={() => setPhotoIndex((i) => Math.max(0, i - 1))}
          />
          <Pressable
            style={[styles.tapZone, styles.tapZoneCenter]}
            onPress={onTapDetail}
          />
          <Pressable
            style={[styles.tapZone, styles.tapZoneRight]}
            onPress={() =>
              setPhotoIndex((i) => Math.min(sortedPhotos.length - 1, i + 1))
            }
          />
        </View>

        {/* Info area — tapping opens detail (photo center zone also opens detail) */}
        <Pressable style={styles.cardInfo} onPress={onTapDetail}>
          <View style={styles.cardInfoTop}>
            <Text style={styles.cardRent}>${listing.monthly_rent}/mo</Text>
            <Text style={styles.cardBeds}>
              {fmtUnitMeta(listing.housing_type, listing.bedrooms, listing.bathrooms)}
            </Text>
          </View>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {listing.title}
            </Text>
            <Text style={styles.cardChevron}>›</Text>
          </View>
          <Text style={styles.cardMeta}>
            {fmtHousingType(listing.housing_type, listing.bedrooms)} in {listing.neighborhood}
            {dateRange ? `  ·  ${dateRange}` : ""}
          </Text>
          {listing.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {listing.description}
            </Text>
          ) : null}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

export default function FeedScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [listings, setListings] = useState<ListingWithPhotos[]>([]);
  const [index, setIndex] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const cardTranslateX = useSharedValue(0);
  const cardTranslateY = useSharedValue(0);

  const lastRequestedId = useRef<string | null>(null);

  const currentListing = listings[index];
  const remaining = listings.length - index;

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (profile) loadListings();
  }, [profile?.id]);
  /* eslint-enable react-hooks/exhaustive-deps */

  async function loadListings() {
    if (!profile) return;
    setFetching(true);
    setFeedError(null);

    try {
      const [listingsRes, requestsRes] = await Promise.all([
        supabase
          .from("listings")
          .select("*, listing_photos(storage_url, sort_order)")
          // Global visibility rule: only "published" listings appear. A listing
          // stays published—and visible to all seekers—until the lister explicitly
          // marks it filled (status → "filled"). Accepting or declining a request
          // does NOT change listing.status, so the listing remains in every other
          // seeker's feed after a request is accepted or declined.
          .eq("status", "published")
          .eq("campus_id", profile.campus_id)
          .neq("owner_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("interest_requests")
          .select("listing_id")
          // Per-seeker exclusion only: hide listings THIS seeker has already
          // interacted with so they don't reappear in the swipe deck. We filter
          // by seeker_id = profile.id, so another seeker's request never removes
          // a listing from this feed. All terminal statuses are included so a
          // declined or cancelled listing doesn't resurface unexpectedly.
          .eq("seeker_id", profile.id)
          .in("status", ["pending", "accepted", "declined", "cancelled", "completed"]),
      ]);

      if (listingsRes.error) throw listingsRes.error;

      const excluded = new Set(
        (requestsRes.data ?? []).map((r) => r.listing_id)
      );
      const filtered = (
        (listingsRes.data ?? []) as unknown as ListingWithPhotos[]
      ).filter((l) => !excluded.has(l.id));

      setListings(filtered);
      setIndex(0);
      lastRequestedId.current = null;
      cardTranslateX.value = 0;
      cardTranslateY.value = 0;
    } catch (e: unknown) {
      setFeedError(e instanceof Error ? e.message : "Couldn't load listings.");
    } finally {
      setFetching(false);
    }
  }

  async function handleRequest() {
    if (!profile || requesting) return;
    const listing = listings[index];
    if (!listing) return;
    if (lastRequestedId.current === listing.id) return;

    lastRequestedId.current = listing.id;
    setRequesting(true);

    cardTranslateX.value = withSpring(SCREEN_WIDTH * 1.5, { damping: 15 });

    const { error } = await supabase.from("interest_requests").insert({
      listing_id: listing.id,
      seeker_id: profile.id,
      lister_id: listing.owner_id,
      status: "pending",
    });

    if (!error || error.code === "23505") {
      cardTranslateX.value = 0;
      cardTranslateY.value = 0;
      setIndex((i) => i + 1);
    } else {
      lastRequestedId.current = null;
      cancelAnimation(cardTranslateX);
      cancelAnimation(cardTranslateY);
      cardTranslateX.value = withSpring(0, { damping: 20 });
      cardTranslateY.value = withSpring(0, { damping: 20 });
      const detail = [
        error.message,
        error.details ? `Details: ${error.details}` : null,
        error.hint ? `Hint: ${error.hint}` : null,
        `Code: ${error.code}`,
      ]
        .filter(Boolean)
        .join("\n");
      Alert.alert("Couldn't send request", detail);
    }

    setRequesting(false);
  }

  function handlePass() {
    if (requesting) return;
    cardTranslateX.value = 0;
    cardTranslateY.value = 0;
    setIndex((i) => i + 1);
  }

  if (fetching) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Discover</Text>
          <Text style={styles.headerSub}>UCSD housing near you</Text>
        </View>
        {!feedError && remaining > 0 && (
          <Text style={styles.headerCount}>
            {remaining} {remaining === 1 ? "listing" : "listings"} left
          </Text>
        )}
      </View>

      <View style={styles.cardArea}>
        {feedError ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{"Couldn't load listings"}</Text>
            <Text style={styles.emptyText}>{feedError}</Text>
            <Pressable style={styles.refreshBtn} onPress={() => void loadListings()}>
              <Text style={styles.refreshBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : currentListing ? (
          <SwipeCard
            key={currentListing.id}
            listing={currentListing}
            translateX={cardTranslateX}
            translateY={cardTranslateY}
            disabled={requesting}
            onPass={handlePass}
            onRequest={() => void handleRequest()}
            onTapDetail={() =>
              router.push(
                `/listings/${currentListing.id}` as Parameters<typeof router.push>[0]
              )
            }
          />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptyText}>
              No more listings right now. Check back later.
            </Text>

            <Pressable style={styles.refreshBtn} onPress={() => void loadListings()}>
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </Pressable>
          </View>
        )}
      </View>

      {currentListing && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.passBtn, requesting && styles.btnDisabled]}
            onPress={handlePass}
            disabled={requesting}
          >
            <Text style={styles.passBtnText}>Pass</Text>
          </Pressable>
          <Pressable
            style={[styles.requestBtn, requesting && styles.btnDisabled]}
            onPress={() => void handleRequest()}
            disabled={requesting}
          >
            <Text style={styles.requestBtnText}>
              {requesting ? "Requesting…" : "Request"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#1a1a1a" },
  headerSub: { fontSize: 12, color: "#94a3b8", fontWeight: "500", marginTop: 1 },
  headerCount: { fontSize: 13, color: "#aaa", fontWeight: "500" },
  cardArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 48, // asymmetric: shifts card upward from dead center
  },
  card: {
    width: SCREEN_WIDTH - 32,
    borderRadius: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
    overflow: "hidden",
  },
  // Swipe overlay badges
  overlayLabel: {
    position: "absolute",
    top: 20,
    zIndex: 20,
    borderWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  overlayRequest: {
    left: 16,
    borderColor: "#22c55e",
    transform: [{ rotate: "-12deg" }],
  },
  overlayRequestText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#22c55e",
    letterSpacing: 1.5,
  },
  overlayPass: {
    right: 16,
    borderColor: "#94a3b8",
    transform: [{ rotate: "12deg" }],
  },
  overlayPassText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#94a3b8",
    letterSpacing: 1.5,
  },
  // Photo area
  photoContainer: { position: "relative" },
  photo: { width: "100%", height: 240 },
  photoPlaceholder: {
    backgroundColor: "#eef2f8",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  photoPlaceholderText: { color: "#94a3b8", fontSize: 13, fontWeight: "500" },
  // Story-style photo progress bars
  photoBars: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    gap: 3,
  },
  photoBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  photoBarActive: {
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  tapZone: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
  tapZoneLeft: { left: 0, width: "20%" },
  tapZoneCenter: { left: "20%", right: "20%" },
  tapZoneRight: { right: 0, width: "20%" },
  // Card info
  cardInfo: { padding: 14, paddingTop: 12, gap: 3 },
  cardInfoTop: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  cardRent: {
    fontSize: 22,
    fontWeight: "800",
    color: "#208AEF",
  },
  cardBeds: { fontSize: 12, color: "#94a3b8", fontWeight: "500" },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1a1a1a", flex: 1 },
  cardChevron: { fontSize: 20, color: "#d1d5db", marginLeft: 6 },
  cardMeta: { fontSize: 13, color: "#666" },
  cardDesc: { fontSize: 13, color: "#999", lineHeight: 18, marginTop: 1 },
  // Action buttons
  actions: {
    flexDirection: "row",
    paddingHorizontal: 32,
    paddingVertical: 20,
    gap: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  passBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#ccc",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  passBtnText: { fontSize: 16, fontWeight: "700", color: "#555" },
  requestBtn: {
    flex: 1,
    backgroundColor: "#208AEF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  requestBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  btnDisabled: { opacity: 0.5 },
  // Empty / error states
  empty: { alignItems: "center", gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: "#1a1a1a" },
  emptyText: { fontSize: 15, color: "#666", textAlign: "center" },
  refreshBtn: {
    backgroundColor: "#208AEF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  refreshBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
