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
import { labelFor, UTILITIES_INCLUDED } from "@sublets/shared/constants";
import type { Tables } from "@sublets/shared/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;

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
  const [expanded, setExpanded] = useState(false);

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
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, { damping: 15 });
        runOnJS(onPass)();
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
        {/* ── absolute layer: photo fills card ── */}
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={styles.fill}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.fill, styles.photoPlaceholder]}>
            <Ionicons name="home-outline" size={52} color="rgba(255,255,255,0.25)" />
            <Text style={styles.placeholderText}>No photos yet</Text>
          </View>
        )}

        {/* ── absolute layer: gradient — bottom half only ── */}
        <View style={styles.gradient} pointerEvents="none">
          <View style={styles.gradClear} />
          <View style={styles.gradFade} />
          <View style={styles.gradDark} />
        </View>

        {/* ── absolute layer: progress bars ── */}
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

        {/* ── absolute layer: swipe direction badges ── */}
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

        {/* ── flex spacer: fills space above cardBottom, hosts tap zones ── */}
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

        {/* ── flex: card bottom — in normal flow, sits at bottom of card ── */}
        <View style={styles.cardBottom}>
          {/* Expanded details panel — dark overlay growing upward */}
          {expanded && (
            <View style={styles.expandedPanel}>
              <Text style={styles.expandedTitle} numberOfLines={2}>
                {listing.title}
              </Text>
              {listing.description ? (
                <Text style={styles.expandedDesc} numberOfLines={4}>
                  {listing.description}
                </Text>
              ) : (
                <Text style={styles.expandedDescEmpty}>
                  No description provided.
                </Text>
              )}
              <View style={styles.expandedRows}>
                {dateRange ? (
                  <View style={styles.expandedRow}>
                    <Text style={styles.expandedRowLabel}>Dates</Text>
                    <Text style={styles.expandedRowValue}>{dateRange}</Text>
                  </View>
                ) : null}
                <View style={styles.expandedRow}>
                  <Text style={styles.expandedRowLabel}>Utilities</Text>
                  <Text style={styles.expandedRowValue}>
                    {labelFor(UTILITIES_INCLUDED, listing.utilities_included)}
                  </Text>
                </View>
                {listing.security_deposit != null && (
                  <View style={styles.expandedRow}>
                    <Text style={styles.expandedRowLabel}>Deposit</Text>
                    <Text style={styles.expandedRowValue}>
                      ${listing.security_deposit}
                    </Text>
                  </View>
                )}
              </View>
              <Pressable onPress={onTapDetail} hitSlop={8}>
                <Text style={styles.viewFullBtnText}>View full listing →</Text>
              </Pressable>
            </View>
          )}

          {/* Info: rent, meta, location, chips, controls */}
          <View style={styles.infoArea}>
            <Text style={styles.infoRent}>${listing.monthly_rent}/mo</Text>
            <View style={styles.infoMetaRow}>
              <Text style={styles.infoMeta}>
                {fmtUnitMeta(listing.housing_type, listing.bedrooms, listing.bathrooms)}
              </Text>
              <Text style={styles.infoMetaDot}> · </Text>
              <Text style={styles.infoMeta}>
                {fmtHousingType(listing.housing_type, listing.bedrooms)}
              </Text>
            </View>
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
            <View style={styles.infoStripRow}>
              {/* Details ˅ — expands/collapses in-card panel */}
              <Pressable
                onPress={() => setExpanded((e) => !e)}
                hitSlop={10}
              >
                <Text style={styles.detailsToggleText}>
                  {expanded ? "Less ˄" : "Details ˅"}
                </Text>
              </Pressable>
              {/* View listing → — navigates to full listing detail route */}
              <Pressable onPress={onTapDetail} hitSlop={10}>
                <Text style={styles.viewListingInlineText}>
                  View listing →
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Pass / Request buttons */}
          <View style={styles.buttonsRow}>
            <Pressable
              style={[styles.passBtn, disabled && styles.btnDisabled]}
              onPress={onPass}
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
    // White container — status bar renders cleanly above this with default dark content.
    // The card carries the dark/immersive aesthetic; the safe area above stays light.
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
  // ── screen ──────────────────────────────────────────────────────────────
  // White background: status bar area stays clean, no dark overlay behind clock/battery.
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },

  // ── header ──────────────────────────────────────────────────────────────
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

  // ── card area ────────────────────────────────────────────────────────────
  // Small gap around the card; light background peeks through the border radius.
  cardArea: {
    flex: 1,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },

  // ── card ─────────────────────────────────────────────────────────────────
  // flex:1 fills cardArea. flexDirection:'column' (default) stacks photoArea + cardBottom.
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

  // ── photo (absolute fill) ─────────────────────────────────────────────────
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  photoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1e2230",
  },
  placeholderText: { color: "rgba(255,255,255,0.3)", fontSize: 13 },

  // ── gradient (absolute fill) — only bottom 60% is colored ────────────────
  // gradClear covers the top 40%: photo shows through without dimming.
  // gradFade is the transition zone.
  // gradDark covers the bottom 30%: enough for text readability.
  gradient: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  gradClear: { flex: 4 },
  gradFade: { flex: 3, backgroundColor: "rgba(0,0,0,0.45)" },
  gradDark: { flex: 3, backgroundColor: "rgba(0,0,0,0.75)" },

  // ── progress bars (absolute top) ─────────────────────────────────────────
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

  // ── swipe badges (absolute) ───────────────────────────────────────────────
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

  // ── photo area (flex spacer, hosts tap zones) ─────────────────────────────
  // flex:1 pushes cardBottom to the bottom of the card.
  // Tap zones are positioned absolute *within* this view, so they only
  // cover the photo portion — not the info/buttons below.
  photoArea: { flex: 1 },
  tapZone: { position: "absolute", top: 0, bottom: 0 },
  tapZoneLeft: { left: 0, width: "30%" },
  tapZoneRight: { right: 0, width: "30%" },

  // ── card bottom (in normal flex flow — always at the physical bottom) ──────
  // No position:absolute here. cardBottom sits naturally below photoArea
  // in the flex column, so it always renders at the correct position.
  cardBottom: {},

  // ── expanded panel ────────────────────────────────────────────────────────
  expandedPanel: {
    backgroundColor: "rgba(0,0,0,0.88)",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  expandedTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
  expandedDesc: { fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 19 },
  expandedDescEmpty: { fontSize: 13, color: "rgba(255,255,255,0.4)", fontStyle: "italic" },
  expandedRows: { gap: 0 },
  expandedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  expandedRowLabel: { fontSize: 12, color: "rgba(255,255,255,0.5)" },
  expandedRowValue: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
    marginLeft: 8,
  },
  viewFullBtnText: { fontSize: 13, color: "#60a5fa", fontWeight: "600" },

  // ── info area ─────────────────────────────────────────────────────────────
  infoArea: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 3,
  },
  infoRent: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  infoMetaRow: { flexDirection: "row", alignItems: "center" },
  infoMeta: { fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: "600" },
  infoMetaDot: { fontSize: 13, color: "rgba(255,255,255,0.5)" },
  infoLocation: { fontSize: 13, color: "rgba(255,255,255,0.72)" },
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
  infoStripRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  // "Details ˅" — expands in-card panel
  detailsToggleText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.75)" },
  // "View listing →" — navigates to /listings/[id]
  viewListingInlineText: { fontSize: 13, fontWeight: "600", color: "#60a5fa" },

  // ── buttons ───────────────────────────────────────────────────────────────
  buttonsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
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

  // ── empty / error ─────────────────────────────────────────────────────────
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
