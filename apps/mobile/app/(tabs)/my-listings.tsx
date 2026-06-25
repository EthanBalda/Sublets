import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { getMyListings, type ListingWithCover } from "@/lib/listings";
import type { ListingStatus } from "@sublets/shared/types";
import { LISTING_STATUS_LABEL } from "@sublets/shared/constants";

const STATUS_COLOR: Record<ListingStatus, { bg: string; text: string }> = {
  draft: { bg: "#f3f4f6", text: "#374151" },
  published: { bg: "#d1fae5", text: "#065f46" },
  paused: { bg: "#fef3c7", text: "#92400e" },
  filled: { bg: "#dbeafe", text: "#1e40af" },
  expired: { bg: "#fee2e2", text: "#991b1b" },
  removed: { bg: "#f3f4f6", text: "#6b7280" },
};

function ListingCard({
  listing,
  onPress,
  onEdit,
}: {
  listing: ListingWithCover;
  onPress: () => void;
  onEdit: () => void;
}) {
  const sc = STATUS_COLOR[listing.status] ?? STATUS_COLOR.draft;
  const cover = listing.listing_photos
    ?.slice()
    .sort((a, b) => a.sort_order - b.sort_order)[0];

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardRow}>
        {cover ? (
          <Image
            source={{ uri: cover.storage_url }}
            style={styles.cardThumb}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.cardThumb, styles.thumbPlaceholder]}>
            <Text style={styles.thumbPlaceholderText}>No{"\n"}photo</Text>
          </View>
        )}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {listing.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.statusText, { color: sc.text }]}>
                {LISTING_STATUS_LABEL[listing.status]}
              </Text>
            </View>
          </View>
          <Text style={styles.cardMeta}>
            ${listing.monthly_rent}/mo · {listing.neighborhood}
          </Text>
          <Text style={styles.cardMeta2}>
            {listing.housing_type.replace(/_/g, " ")} · {listing.bedrooms} bd ·{" "}
            {listing.bathrooms} ba
          </Text>
          <Pressable style={styles.editBtn} onPress={onEdit}>
            <Text style={styles.editBtnText}>Edit →</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export default function MyListingsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [listings, setListings] = useState<ListingWithCover[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      setLoading(true);
      setError(null);
      getMyListings(profile.id)
        .then(setListings)
        .catch((e: unknown) =>
          setError(e instanceof Error ? e.message : String(e))
        )
        .finally(() => setLoading(false));
    }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Listings</Text>
        <Pressable
          style={styles.createBtn}
          onPress={() => router.push("/listings/new")}
        >
          <Text style={styles.createBtnText}>+ Create</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#208AEF" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No listings yet</Text>
          <Text style={styles.emptyBody}>
            Create your first listing so seekers can find your space.
          </Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => router.push("/listings/new")}
          >
            <Text style={styles.emptyBtnText}>Create Listing</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(l) => l.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              onPress={() =>
                router.push(
                  `/listings/${item.id}` as Parameters<typeof router.push>[0]
                )
              }
              onEdit={() =>
                router.push(
                  `/listings/${item.id}/edit` as Parameters<typeof router.push>[0]
                )
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#1a1a1a" },
  createBtn: {
    backgroundColor: "#208AEF",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: "#dc2626", fontSize: 14 },
  list: { padding: 16, gap: 12 },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#1a1a1a" },
  emptyBody: { fontSize: 15, color: "#666", textAlign: "center" },
  emptyBtn: {
    backgroundColor: "#208AEF",
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  cardThumb: {
    width: 80,
    height: 80,
    flexShrink: 0,
  },
  thumbPlaceholder: {
    backgroundColor: "#e8ecef",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbPlaceholderText: {
    fontSize: 11,
    color: "#aaa",
    textAlign: "center",
  },
  cardContent: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: "600" },
  cardMeta: { fontSize: 13, color: "#444" },
  cardMeta2: { fontSize: 12, color: "#888", textTransform: "capitalize" },
  editBtn: {
    marginTop: 4,
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#208AEF",
    borderRadius: 8,
  },
  editBtnText: { color: "#208AEF", fontWeight: "600", fontSize: 12 },
});
