import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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

const STATUS_GROUP_ORDER: InterestRequestStatus[] = [
  "pending",
  "accepted",
  "completed",
  "declined",
  "cancelled",
];

function groupByStatus<T extends { status: InterestRequestStatus }>(
  items: T[]
): { status: InterestRequestStatus; items: T[] }[] {
  return STATUS_GROUP_ORDER
    .map((s) => ({ status: s, items: items.filter((i) => i.status === s) }))
    .filter((g) => g.items.length > 0);
}

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

function Badge({ status }: { status: InterestRequestStatus }) {
  return (
    <View style={[styles.badge, { backgroundColor: STATUS_BG[status] }]}>
      <Text style={[styles.badgeText, { color: STATUS_COLOR[status] }]}>
        {STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

export default function RequestsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setFetching(true);
    setError(null);

    const [incomingRes, outgoingRes] = await Promise.all([
      supabase
        .from("interest_requests")
        .select("id, status, message, created_at, seeker_id, listing_id")
        .eq("lister_id", profile.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("interest_requests")
        .select("id, status, created_at, listing_id")
        .eq("seeker_id", profile.id)
        .order("created_at", { ascending: false }),
    ]);

    if (incomingRes.error || outgoingRes.error) {
      setError("Couldn't load requests.");
      setFetching(false);
      return;
    }

    const inReqs = incomingRes.data ?? [];
    const outReqs = outgoingRes.data ?? [];

    const allListingIds = [
      ...new Set([...inReqs.map((r) => r.listing_id), ...outReqs.map((r) => r.listing_id)]),
    ];
    const seekerIds = [...new Set(inReqs.map((r) => r.seeker_id))];

    const [{ data: listings }, { data: seekers }] = await Promise.all([
      allListingIds.length > 0
        ? supabase.from("listings").select("id, title, monthly_rent").in("id", allListingIds)
        : Promise.resolve({ data: [] }),
      seekerIds.length > 0
        ? supabase.from("profiles").select("id, full_name").in("id", seekerIds)
        : Promise.resolve({ data: [] }),
    ]);

    const listingById = new Map((listings ?? []).map((l) => [l.id, l]));
    const seekerById = new Map((seekers ?? []).map((p) => [p.id, p]));

    setIncoming(
      inReqs.map((r) => ({
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

    setOutgoing(
      outReqs.map((r) => ({
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

  if (error) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Requests</Text>
      </View>

      {/* Incoming */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Incoming</Text>
        <Text style={styles.sectionSub}>Requests on your listings</Text>
      </View>

      {incoming.length === 0 ? (
        <View style={styles.emptySection}>
          <Text style={styles.emptyText}>No incoming requests yet.</Text>
        </View>
      ) : (
        groupByStatus(incoming).map((group) => (
          <View key={group.status}>
            <Text style={styles.statusGroupLabel}>{STATUS_LABEL[group.status]}</Text>
            {group.items.map((item) => (
              <Pressable
                key={item.id}
                style={styles.card}
                onPress={() => router.push(`/request/${item.id}?returnTo=/(tabs)/requests` as Parameters<typeof router.push>[0])}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.listingTitle} numberOfLines={1}>
                    {item.listing_title ?? "Listing"}
                  </Text>
                  <Badge status={item.status} />
                </View>
                <View style={styles.cardRow}>
                  {item.monthly_rent != null && (
                    <Text style={styles.rentText}>${item.monthly_rent}/mo</Text>
                  )}
                  <Text style={styles.seekerName}>
                    {item.seeker_name ?? "Unknown seeker"}
                  </Text>
                </View>
                {item.message ? (
                  <Text style={styles.messagePreview} numberOfLines={1}>
                    {`"${item.message}"`}
                  </Text>
                ) : null}
                <Text style={styles.dateText}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </Pressable>
            ))}
          </View>
        ))
      )}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Outgoing */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Requests</Text>
        <Text style={styles.sectionSub}>{"Listings you've requested"}</Text>
      </View>

      {outgoing.length === 0 ? (
        <View style={styles.emptySection}>
          <Text style={styles.emptyText}>
            No requests sent yet. Swipe right on a listing to send one.
          </Text>
        </View>
      ) : (
        groupByStatus(outgoing).map((group) => (
          <View key={group.status}>
            <Text style={styles.statusGroupLabel}>{STATUS_LABEL[group.status]}</Text>
            {group.items.map((item) => (
              <Pressable
                key={item.id}
                style={styles.card}
                onPress={() => router.push(`/request/${item.id}?returnTo=/(tabs)/requests` as Parameters<typeof router.push>[0])}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.listingTitle} numberOfLines={1}>
                    {item.listing_title ?? "Listing"}
                  </Text>
                  <Badge status={item.status} />
                </View>
                {item.monthly_rent != null && (
                  <Text style={styles.metaText}>${item.monthly_rent}/mo</Text>
                )}
                <Text style={styles.dateText}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </Pressable>
            ))}
          </View>
        ))
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  scrollContent: { paddingBottom: 16 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#1a1a1a" },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 2,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  sectionSub: { fontSize: 12, color: "#888" },
  divider: { height: 1, backgroundColor: "#eee", marginHorizontal: 20, marginTop: 8 },
  emptySection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyText: { fontSize: 14, color: "#888" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    gap: 5,
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
  cardRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rentText: { fontSize: 14, fontWeight: "700", color: "#208AEF" },
  seekerName: { fontSize: 13, color: "#555", flex: 1 },
  metaText: { fontSize: 14, color: "#555" },
  messagePreview: { fontSize: 13, color: "#777", fontStyle: "italic" },
  dateText: { fontSize: 12, color: "#aaa" },
  statusGroupLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
  },
  errorText: { fontSize: 15, color: "#dc2626", textAlign: "center" },
  retryBtn: {
    backgroundColor: "#208AEF",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
