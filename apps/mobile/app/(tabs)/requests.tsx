import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { InterestRequestStatus } from "@sublets/shared/types";

type IncomingRequest = {
  id: string;
  status: InterestRequestStatus;
  message: string | null;
  created_at: string;
  seeker_id: string;
  listing_id: string;
  listing_title: string | null;
  monthly_rent: number | null;
  seeker_name: string | null;
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

export default function RequestsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setFetching(true);
    setError(null);

    const { data: reqs, error: reqErr } = await supabase
      .from("interest_requests")
      .select("id, status, message, created_at, seeker_id, listing_id")
      .eq("lister_id", profile.id)
      .order("created_at", { ascending: false });

    if (reqErr) {
      setError("Couldn't load requests.");
      setFetching(false);
      return;
    }
    if (!reqs || reqs.length === 0) {
      setRequests([]);
      setFetching(false);
      return;
    }

    const listingIds = [...new Set(reqs.map((r) => r.listing_id))];
    const seekerIds = [...new Set(reqs.map((r) => r.seeker_id))];

    const [{ data: listings }, { data: seekers }] = await Promise.all([
      supabase
        .from("listings")
        .select("id, title, monthly_rent")
        .in("id", listingIds),
      supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", seekerIds),
    ]);

    const listingById = new Map(
      (listings ?? []).map((l) => [l.id, l])
    );
    const seekerById = new Map(
      (seekers ?? []).map((p) => [p.id, p])
    );

    setRequests(
      reqs.map((r) => ({
        id: r.id,
        status: r.status as InterestRequestStatus,
        message: r.message,
        created_at: r.created_at,
        seeker_id: r.seeker_id,
        listing_id: r.listing_id,
        listing_title: listingById.get(r.listing_id)?.title ?? null,
        monthly_rent: listingById.get(r.listing_id)?.monthly_rent ?? null,
        seeker_name: seekerById.get(r.seeker_id)?.full_name ?? null,
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
        <Text style={styles.headerTitle}>Incoming Requests</Text>
        <Text style={styles.headerSub}>Requests from students interested in your listings</Text>
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
          <Text style={styles.emptyTitle}>No incoming requests yet</Text>
          <Text style={styles.emptyText}>
            Requests from students interested in your listings will show up here.
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
              onPress={() => router.push(`/request/${item.id}`)}
            >
              <View style={styles.cardTop}>
                <Text style={styles.listingTitle} numberOfLines={1}>
                  {item.listing_title ?? "Listing"}
                </Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: STATUS_BG[item.status] },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: STATUS_COLOR[item.status] },
                    ]}
                  >
                    {STATUS_LABEL[item.status]}
                  </Text>
                </View>
              </View>

              {item.monthly_rent != null && (
                <Text style={styles.rentText}>
                  ${item.monthly_rent}/mo
                </Text>
              )}

              <Text style={styles.seekerName}>
                From: {item.seeker_name ?? "Unknown"}
              </Text>

              {item.message ? (
                <Text style={styles.messagePreview} numberOfLines={2}>
                  {`"${item.message}"`}
                </Text>
              ) : null}

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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#1a1a1a" },
  headerSub: { fontSize: 13, color: "#888", marginTop: 2 },
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
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },
  rentText: { fontSize: 14, color: "#444" },
  seekerName: { fontSize: 14, color: "#555" },
  messagePreview: { fontSize: 13, color: "#777", fontStyle: "italic" },
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
