import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
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
  onPass,
  onLike,
}: {
  listing: ListingWithPhotos;
  onPass: () => void;
  onLike: () => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

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
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.3;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(
          SCREEN_WIDTH * 1.5,
          { damping: 15 },
          (done) => {
            if (done) runOnJS(onLike)();
          }
        );
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(
          -SCREEN_WIDTH * 1.5,
          { damping: 15 },
          (done) => {
            if (done) runOnJS(onPass)();
          }
        );
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

  useEffect(() => {
    if (profile) loadListings();
  }, [profile?.id]);

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
    const filtered = ((listingsRes.data ?? []) as unknown as ListingWithPhotos[]).filter(
      (l) => !excluded.has(l.id)
    );

    setListings(filtered);
    setIndex(0);
    setFetching(false);
  }

  function handleLike() {
    if (!profile) return;
    const listing = listings[index];
    if (!listing) return;

    setIndex((i) => i + 1);

    supabase.from("interest_requests").insert({
      listing_id: listing.id,
      seeker_id: profile.id,
      lister_id: listing.owner_id,
      status: "pending",
    });
  }

  function handlePass() {
    setIndex((i) => i + 1);
  }

  const currentListing = listings[index];

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
            onPass={handlePass}
            onLike={handleLike}
          />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptyText}>
              No more listings right now. Check back later.
            </Text>
            <Pressable style={styles.refreshBtn} onPress={loadListings}>
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </Pressable>
          </View>
        )}
      </View>

      {currentListing && (
        <View style={styles.actions}>
          <Pressable style={styles.passBtn} onPress={handlePass}>
            <Text style={styles.passBtnText}>Pass</Text>
          </Pressable>
          <Pressable style={styles.likeBtn} onPress={handleLike}>
            <Text style={styles.likeBtnText}>Like</Text>
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
  likeBtn: {
    flex: 1,
    backgroundColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  likeBtnText: { fontSize: 16, fontWeight: "600", color: "#fff" },
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
