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
}: {
  listing: ListingWithPhotos;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  disabled: boolean;
  onPass: () => void;
  onRequest: () => void;
}) {
  const photo = listing.listing_photos
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)[0];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${(translateX.value / SCREEN_WIDTH) * 15}deg` },
    ],
  }));

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.3;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        // Start immediate visual response on UI thread. handleRequest will
        // also call withSpring when it runs on the JS thread — reinforcing
        // this animation is harmless and handles the button-tap path too.
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

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, animatedStyle]}>
        {photo ? (
          <Image
            source={{ uri: photo.storage_url }}
            style={styles.photo}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Text style={styles.photoPlaceholderText}>No photo</Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {listing.title}
          </Text>
          <Text style={styles.cardMeta}>
            ${listing.monthly_rent}/mo · {listing.neighborhood}
          </Text>
          <Text style={styles.cardMeta2}>
            {listing.housing_type} · {listing.bedrooms} bd ·{" "}
            {listing.bathrooms} ba
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export default function FeedScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [listings, setListings] = useState<ListingWithPhotos[]>([]);
  const [index, setIndex] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [requesting, setRequesting] = useState(false);

  // Shared animation values live in the parent so handleRequest can
  // snap the card back on insert failure without losing the animation state.
  const cardTranslateX = useSharedValue(0);
  const cardTranslateY = useSharedValue(0);

  // Guard against requesting the same listing twice if swipe + button fire together.
  const lastRequestedId = useRef<string | null>(null);

  const currentListing = listings[index];

  // profile?.id as a primitive dep is intentional — avoids re-running on reference churn.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (profile) loadListings();
  }, [profile?.id]);
  /* eslint-enable react-hooks/exhaustive-deps */

  async function loadListings() {
    if (!profile) return;
    setFetching(true);

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
        .in("status", ["pending", "accepted"]),
    ]);

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
    setFetching(false);
  }

  async function handleRequest() {
    if (!profile || requesting) return;
    const listing = listings[index];
    if (!listing) return;
    // Guard: prevent a swipe + button tap from firing two inserts for the same card.
    if (lastRequestedId.current === listing.id) return;

    lastRequestedId.current = listing.id;
    setRequesting(true);

    // Animate card off screen to the right. For swipe, the gesture already
    // started this spring; calling it again just reinforces the target.
    // For button tap, this is the only animation trigger.
    cardTranslateX.value = withSpring(SCREEN_WIDTH * 1.5, { damping: 15 });

    const { error } = await supabase.from("interest_requests").insert({
      listing_id: listing.id,
      seeker_id: profile.id,
      lister_id: listing.owner_id,
      status: "pending",
    });

    if (!error || error.code === "23505") {
      // Success, or duplicate (seeker already has a request for this listing).
      // Reset animation values before advancing so the new card renders at 0.
      cardTranslateX.value = 0;
      cardTranslateY.value = 0;
      setIndex((i) => i + 1);
    } else {
      // Insert failed — snap card back and surface the error.
      lastRequestedId.current = null; // allow retry
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
        <Text style={styles.headerTitle}>Sublets</Text>
      </View>

      <View style={styles.cardArea}>
        {currentListing ? (
          <SwipeCard
            key={currentListing.id}
            listing={currentListing}
            translateX={cardTranslateX}
            translateY={cardTranslateY}
            disabled={requesting}
            onPass={handlePass}
            onRequest={() => void handleRequest()}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#1a1a1a" },
  cardArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: SCREEN_WIDTH - 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    overflow: "hidden",
  },
  photo: { width: "100%", height: 280 },
  photoPlaceholder: {
    backgroundColor: "#e8ecef",
    justifyContent: "center",
    alignItems: "center",
  },
  photoPlaceholderText: { color: "#aaa", fontSize: 15 },
  cardInfo: { padding: 16, gap: 4 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  cardMeta: { fontSize: 15, color: "#444" },
  cardMeta2: { fontSize: 14, color: "#777" },
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
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  passBtnText: { fontSize: 16, fontWeight: "600", color: "#555" },
  requestBtn: {
    flex: 1,
    backgroundColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  requestBtnText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  btnDisabled: { opacity: 0.5 },
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
