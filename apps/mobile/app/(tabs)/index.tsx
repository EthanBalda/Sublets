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
import { fmtHousingType, fmtUnitMeta, fmtDateRange } from "@/lib/format";
import type { Tables } from "@sublets/shared/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;

// Bottom-anchored gradient steps (opacity only, no transparent top zone).
// The container is positioned at bottom:0 height:"55%", so the first step (opacity 0)
// sits right at the gradient's top edge — no hard boundary with the clean photo above.
// 15 steps follow an easeIn curve so early increments are tiny and imperceptible.
const GRAD_STEPS: number[] = [
  0, 0.03, 0.07, 0.12, 0.18, 0.25, 0.33, 0.42,
  0.51, 0.60, 0.68, 0.74, 0.79, 0.83, 0.86,
];

type ListingWithPhotos = Tables<"listings"> & {
  listing_photos: Pick<Tables<"listing_photos">, "storage_url" | "sort_order">[];
};

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
  const hasMultiplePhotos = sortedPhotos.length > 1;
  const photo = sortedPhotos[photoIndex] ?? null;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${(translateX.value / SCREEN_WIDTH) * 15}deg` },
    ],
  }));

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
        // Animate card off-screen left; advance only after animation completes.
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, { damping: 15 }, (finished) => {
          if (finished) {
            runOnJS(onPass)();
          }
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const dateRange = fmtDateRange(
    listing.available_start_date,
    listing.available_end_date
  );

  const amenityChips: string[] = [];
  if (listing.furnished) amenityChips.push("Furnished");
  if (listing.parking_available) amenityChips.push("Parking");
  if (listing.laundry_available) amenityChips.push("Laundry");
  if (listing.pets_allowed) amenityChips.push("Pets OK");

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, animatedStyle]}>

        {/* absolute: photo fills card */}
        {photo ? (
          <Image source={{ uri: photo }} style={styles.fill} contentFit="cover" />
        ) : (
          <View style={[styles.fill, styles.photoPlaceholder]}>
            <Ionicons name="home-outline" size={52} color="rgba(255,255,255,0.25)" />
            <Text style={styles.placeholderText}>No photos yet</Text>
          </View>
        )}

        {/* absolute: gradient anchored to bottom 55% only — no transparent zone above,
            so there is no hard edge between clean photo and gradient start */}
        <View style={styles.gradient} pointerEvents="none">
          {GRAD_STEPS.map((opacity, i) => (
            <View
              key={i}
              style={{ flex: 1, backgroundColor: `rgba(0,0,0,${opacity})` }}
            />
          ))}
        </View>

        {/* absolute: photo progress bars */}
        {hasMultiplePhotos && (
          <View style={styles.photoBars} pointerEvents="none">
            {sortedPhotos.map((_, i) => (
              <View
                key={i}
                style={[styles.photoBar, i === photoIndex && styles.photoBarActive]}
              />
            ))}
          </View>
        )}

        {/* absolute: swipe direction badges */}
        <Animated.View
          style={[styles.swipeLabel, styles.swipeLabelRequest, requestOverlayStyle]}
          pointerEvents="none"
        >
          <Text style={styles.swipeLabelRequestText}>REQUEST</Text>
        </Animated.View>
        <Animated.View
          style={[styles.swipeLabel, styles.swipeLabelPass, passOverlayStyle]}
          pointerEvents="none"
        >
          <Text style={styles.swipeLabelPassText}>PASS</Text>
        </Animated.View>

        {/* flex spacer: holds the photo tap zones, pushes cardBottom down */}
        <View style={styles.photoArea}>
          {hasMultiplePhotos && (
            <>
              <Pressable
                style={[styles.tapZone, styles.tapZoneLeft]}
                onPress={() => setPhotoIndex((i) => Math.max(0, i - 1))}
              />
              <Pressable
                style={[styles.tapZone, styles.tapZoneRight]}
                onPress={() =>
                  setPhotoIndex((i) => Math.min(sortedPhotos.length - 1, i + 1))
                }
              />
            </>
          )}
        </View>

        {/* card bottom — in normal flex flow, always at the physical bottom */}
        <View style={styles.cardBottom}>
          <View style={styles.infoArea}>
            <Text style={styles.infoRent}>${listing.monthly_rent}/mo</Text>
            <Text style={styles.infoTitle} numberOfLines={1}>
              {listing.title}
            </Text>
            <Text style={styles.infoMeta} numberOfLines={1}>
              {fmtUnitMeta(listing.housing_type, listing.bedrooms, listing.bathrooms)}
              {" · "}
              {fmtHousingType(listing.housing_type, listing.bedrooms)}
            </Text>
            <Text style={styles.infoLocation} numberOfLines={1}>
              {listing.neighborhood}
              {dateRange ? `  ·  ${dateRange}` : ""}
            </Text>
            {amenityChips.length > 0 && (
              <View style={styles.chipsRow}>
                {amenityChips.slice(0, 3).map((chip) => (
                  <View key={chip} style={styles.chip}>
                    <Text style={styles.chipText}>{chip}</Text>
                  </View>
                ))}
              </View>
            )}
            {/* Single "View listing" action — tap navigates to full detail screen */}
            <Pressable onPress={onTapDetail} hitSlop={10} style={styles.viewListingBtn}>
              <Text style={styles.viewListingBtnText}>View listing →</Text>
            </Pressable>
          </View>

          <View style={styles.buttonsRow}>
            <Pressable
              style={[styles.passBtn, disabled && styles.btnDisabled]}
              onPress={() => {
                // Mirror swipe-left: animate card off-screen left, advance in callback.
                translateX.value = withSpring(-SCREEN_WIDTH * 1.5, { damping: 15 }, (finished) => {
                  if (finished) {
                    runOnJS(onPass)();
                  }
                });
              }}
              disabled={disabled}
            >
              <Text style={styles.passBtnText}>Pass</Text>
            </Pressable>
            <Pressable
              style={[styles.requestBtn, disabled && styles.btnDisabled]}
              onPress={onRequest}
              disabled={disabled}
            >
              <Text style={styles.requestBtnText}>
                {disabled ? "Requesting…" : "Request"}
              </Text>
            </Pressable>
          </View>
        </View>
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
          .eq("status", "published")
          .eq("campus_id", profile.campus_id)
          .neq("owner_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("interest_requests")
          .select("listing_id")
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
      Alert.alert(
        "Couldn't send request",
        [
          error.message,
          error.details ? `Details: ${error.details}` : null,
          error.hint ? `Hint: ${error.hint}` : null,
          `Code: ${error.code}`,
        ]
          .filter(Boolean)
          .join("\n")
      );
    }

    setRequesting(false);
  }

  function handlePass() {
    // Called after pass animation completes (from swipe-left or Pass button callback).
    // Reset shared values so the incoming card starts at center.
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
          <View style={styles.emptyWrap}>
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
                `/listings/${currentListing.id}?returnTo=/(tabs)` as Parameters<
                  typeof router.push
                >[0]
              )
            }
          />
        ) : (
          <View style={styles.emptyWrap}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  // White background so the status bar area stays clean above the card.
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#1a1a1a" },
  headerSub: { fontSize: 11, color: "#94a3b8", fontWeight: "500", marginTop: 1 },
  headerCount: { fontSize: 12, color: "#aaa" },

  cardArea: { flex: 1, paddingHorizontal: 8, paddingBottom: 8 },

  // flex:1 makes the card fill all remaining vertical space.
  card: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1a1a2e",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },

  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  photoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1e2230",
  },
  placeholderText: { color: "rgba(255,255,255,0.3)", fontSize: 13 },

  // Gradient anchored to the bottom 55% of the card only.
  // Above this view the photo is completely unobscured — no dark overlay anywhere
  // in the upper half. The first step has opacity 0 so there is no hard edge.
  gradient: { position: "absolute", bottom: 0, left: 0, right: 0, height: "55%" },

  photoBars: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    gap: 3,
  },
  photoBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  photoBarActive: { backgroundColor: "rgba(255,255,255,0.95)" },

  swipeLabel: {
    position: "absolute",
    top: 24,
    zIndex: 20,
    borderWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  swipeLabelRequest: {
    left: 16,
    borderColor: "#22c55e",
    transform: [{ rotate: "-12deg" }],
  },
  swipeLabelRequestText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#22c55e",
    letterSpacing: 1.5,
  },
  swipeLabelPass: {
    right: 16,
    borderColor: "#94a3b8",
    transform: [{ rotate: "12deg" }],
  },
  swipeLabelPassText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#94a3b8",
    letterSpacing: 1.5,
  },

  // flex:1 spacer that pushes cardBottom to the physical bottom of the card.
  // Tap zones are absolute within this view so they only cover the photo area.
  photoArea: { flex: 1 },
  tapZone: { position: "absolute", top: 0, bottom: 0 },
  tapZoneLeft: { left: 0, width: "30%" },
  tapZoneRight: { right: 0, width: "30%" },

  // In normal flex flow — no position:absolute, always renders at the true bottom.
  cardBottom: {},

  infoArea: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 2,
  },
  infoRent: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.92)",
  },
  infoMeta: {
    fontSize: 13,
    color: "rgba(255,255,255,0.82)",
    fontWeight: "500",
  },
  infoLocation: { fontSize: 13, color: "rgba(255,255,255,0.68)" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  chip: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  chipText: { fontSize: 11, color: "#fff", fontWeight: "600" },
  viewListingBtn: { marginTop: 6 },
  viewListingBtnText: { fontSize: 13, fontWeight: "600", color: "#60a5fa" },

  buttonsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  passBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  passBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  requestBtn: {
    flex: 1,
    backgroundColor: "#208AEF",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  requestBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  btnDisabled: { opacity: 0.5 },

  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
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
