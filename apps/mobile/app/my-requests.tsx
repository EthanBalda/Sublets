import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { navigateBack } from "@/lib/navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { InterestRequestStatus } from "@sublets/shared/types";

type OutgoingRequest = {
  id: string;
  status: InterestRequestStatus;
  created_at: string;
  listing_id: string;
  listing_title: string | null;
  monthly_rent: number | null;
};

const STATUS_LABEL: Record<InterestRequestStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Cancelled",
  completed: "Completed",
};

const STATUS_COLOR: Record<InterestRequestStatus, string> = {
  pending: "#b45309",
  accepted: "#065f46",
  declined: "#6b7280",
  cancelled: "#6b7280",
  completed: "#1d4ed8",
};

const STATUS_BG: Record<InterestRequestStatus, string> = {
  pending: "#fef3c7",
  accepted: "#d1fae5",
  declined: "#f3f4f6",
  cancelled: "#f3f4f6",
  completed: "#dbeafe",
};

export default function MyRequestsScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  function goBack() {
    navigateBack(
      router,
      navigation,
      returnTo,
      "/(tabs)/account" as Parameters<typeof router.replace>[0]
    );
  }
  const [requests, setRequests] = useState<OutgoingRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setFetching(true);
    setError(null);

    const { data: reqs, error: reqErr } = await supabase
      .from("interest_requests")
      .select("id, status, created_at, listing_id")
      .eq("seeker_id", profile.id)
      .order("created_at", { ascending: false });

    if (reqErr) {
      setError("Couldn't load your requests.");
      setFetching(false);
      return;
    }

    if (!reqs || reqs.length === 0) {
      setRequests([]);
      setFetching(false);
      return;
    }

    const listingIds = [...new Set(reqs.map((r) => r.listing_id))];
    const { data: listings } = await supabase
      .from("listings")
      .select("id, title, monthly_rent")
      .in("id", listingIds);

    const listingById = new Map((listings ?? []).map((l) => [l.id, l]));

    setRequests(
      reqs.map((r) => ({
        id: r.id,
        status: r.status as InterestRequestStatus,
        created_at: r.created_at,
        listing_id: r.listing_id,
        listing_title: listingById.get(r.listing_id)?.title ?? null,
        monthly_rent: listingById.get(r.listing_id)?.monthly_rent ?? null,
      }))
    );
    setFetching(false);
  }, [profile]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

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
        <Pressable onPress={goBack} style={styles.backRow}>
          <Text style={styles.backLabel}>← Account</Text>
        </Pressable>
        <Text style={styles.headerTitle}>My Sent Requests</Text>
        <Text style={styles.headerSub}>Listings you have requested</Text>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No requests yet</Text>
          <Text style={styles.emptyText}>
            Swipe right on listings in the feed to send a request.
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/request/${item.id}?returnTo=/my-requests` as Parameters<typeof router.push>[0])}
            >
              <View style={styles.cardTop}>
                <Text style={styles.listingTitle} numberOfLines={1}>
                  {item.listing_title ?? "Listing"}
                </Text>
                <View style={[styles.badge, { backgroundColor: STATUS_BG[item.status] }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>
                    {STATUS_LABEL[item.status]}
                  </Text>
                </View>
              </View>
              {item.monthly_rent != null && (
                <Text style={styles.rentText}>${item.monthly_rent}/mo</Text>
              )}
              <Text style={styles.dateText}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </Pressable>
          )}
        />
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
    paddingHorizontal: 32,
    gap: 12,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
    gap: 4,
  },
  backRow: { marginBottom: 4 },
  backLabel: { fontSize: 15, color: "#208AEF", fontWeight: "500" },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#1a1a1a" },
  headerSub: { fontSize: 13, color: "#888" },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    gap: 6,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listingTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    marginRight: 8,
  },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  rentText: { fontSize: 14, color: "#444" },
  dateText: { fontSize: 12, color: "#aaa" },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#1a1a1a" },
  emptyText: { fontSize: 14, color: "#666", textAlign: "center" },
  errorText: { fontSize: 15, color: "#dc2626", textAlign: "center" },
  retryBtn: {
    backgroundColor: "#208AEF",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
