import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getOrCreateConversation, findConversation } from "@/lib/messages";
import type { InterestRequestStatus, Tables } from "@sublets/shared/types";

// Mirror of web's DEFAULT_CHECKLIST_ITEMS — inserted on accept.
const DEFAULT_CHECKLIST_ITEMS = [
  { key: "confirm_dates", label: "Confirm dates" },
  { key: "confirm_rent", label: "Confirm rent" },
  { key: "confirm_deposit", label: "Confirm deposit" },
  { key: "confirm_roommate_approval", label: "Confirm roommate approval" },
  { key: "confirm_landlord_approval", label: "Confirm landlord approval" },
  {
    key: "confirm_agreement_signed",
    label: "Confirm agreement signed outside platform",
  },
  { key: "confirm_move_plan", label: "Confirm move-in/move-out plan" },
] as const;

type RequestDetail = {
  id: string;
  status: InterestRequestStatus;
  message: string | null;
  created_at: string;
  seeker_id: string;
  lister_id: string;
  listing_id: string;
  listing: Pick<
    Tables<"listings">,
    "id" | "title" | "monthly_rent" | "neighborhood" | "bedrooms" | "bathrooms"
  > | null;
  seeker: Pick<Tables<"profiles">, "id" | "full_name" | "major" | "graduation_year" | "bio"> | null;
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

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const load = useCallback(async () => {
    if (!id || !profile) return;
    setFetching(true);
    setFetchError(null);

    const { data: req, error: reqErr } = await supabase
      .from("interest_requests")
      .select(
        "id, status, message, created_at, seeker_id, lister_id, listing_id"
      )
      .eq("id", id)
      .maybeSingle();

    if (reqErr || !req) {
      setFetchError("Request not found.");
      setFetching(false);
      return;
    }

    // Must be a participant.
    if (req.seeker_id !== profile.id && req.lister_id !== profile.id) {
      setFetchError("You don't have access to this request.");
      setFetching(false);
      return;
    }

    const [{ data: listing }, { data: profiles }] = await Promise.all([
      supabase
        .from("listings")
        .select("id, title, monthly_rent, neighborhood, bedrooms, bathrooms")
        .eq("id", req.listing_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("id, full_name, major, graduation_year, bio")
        .in("id", [req.seeker_id]),
    ]);

    const seekerProfile = (profiles ?? []).find((p) => p.id === req.seeker_id) ?? null;

    setDetail({
      id: req.id,
      status: req.status as InterestRequestStatus,
      message: req.message,
      created_at: req.created_at,
      seeker_id: req.seeker_id,
      lister_id: req.lister_id,
      listing_id: req.listing_id,
      listing: listing ?? null,
      seeker: seekerProfile,
    });
    setFetching(false);
  }, [id, profile]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function handleAccept() {
    if (!detail || !profile || submitting) return;
    if (detail.lister_id !== profile.id) return;

    setSubmitting(true);

    const { error: updateErr } = await supabase
      .from("interest_requests")
      .update({ status: "accepted" })
      .eq("id", detail.id);

    if (updateErr) {
      Alert.alert("Error", "Couldn't accept the request. Try again.");
      setSubmitting(false);
      return;
    }

    // Install default checklist items, skipping any already present.
    const { data: existing } = await supabase
      .from("sublet_checklist_items")
      .select("key")
      .eq("interest_request_id", detail.id);

    const existingKeys = new Set((existing ?? []).map((e) => e.key));
    const toInsert = DEFAULT_CHECKLIST_ITEMS.filter(
      (item) => !existingKeys.has(item.key)
    ).map((item) => ({
      interest_request_id: detail.id,
      key: item.key,
      label: item.label,
    }));

    if (toInsert.length > 0) {
      const { error: checklistErr } = await supabase
        .from("sublet_checklist_items")
        .insert(toInsert);
      if (checklistErr) {
        // Accept succeeded — checklist failure is non-fatal, just warn.
        Alert.alert(
          "Accepted",
          "Request accepted, but checklist setup failed. It can be retried."
        );
      }
    }

    setSubmitting(false);
    // Reload to reflect new status.
    await load();
  }

  async function handleDecline() {
    if (!detail || !profile || submitting) return;
    if (detail.lister_id !== profile.id) return;

    Alert.alert(
      "Decline request?",
      "The seeker will see their request as declined.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            setSubmitting(true);

            const { error } = await supabase
              .from("interest_requests")
              .update({ status: "declined" })
              .eq("id", detail.id);

            if (error) {
              Alert.alert("Error", "Couldn't decline the request. Try again.");
              setSubmitting(false);
              return;
            }

            setSubmitting(false);
            await load();
          },
        },
      ]
    );
  }

  async function handleMessage() {
    if (!detail || !profile || messaging) return;
    setMessaging(true);

    try {
      const isSeeker = detail.seeker_id === profile.id;
      let convId: string | null;

      if (isSeeker) {
        // Seeker can create the conversation if it doesn't exist.
        convId = await getOrCreateConversation(
          detail.listing_id,
          profile.id,
          detail.lister_id
        );
      } else {
        // Lister can only read; seeker must initiate.
        convId = await findConversation(
          detail.listing_id,
          detail.seeker_id,
          profile.id
        );
        if (!convId) {
          Alert.alert(
            "No conversation yet",
            "The seeker hasn't started a conversation. Ask them to tap Message on the request."
          );
          setMessaging(false);
          return;
        }
      }

      router.push(`/messages/${convId}`);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Couldn't open messages.");
    } finally {
      setMessaging(false);
    }
  }

  if (fetching) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  if (fetchError || !detail) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{fetchError ?? "Not found."}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isLister = detail.lister_id === profile?.id;
  const isPending = detail.status === "pending";
  const isAccepted = detail.status === "accepted";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
      ]}
    >
      {/* Back */}
      <Pressable style={styles.backRow} onPress={() => router.back()}>
        <Text style={styles.backLabel}>← Requests</Text>
      </Pressable>

      {/* Status */}
      <View style={styles.statusRow}>
        <View
          style={[styles.badge, { backgroundColor: STATUS_BG[detail.status] }]}
        >
          <Text
            style={[styles.badgeText, { color: STATUS_COLOR[detail.status] }]}
          >
            {STATUS_LABEL[detail.status]}
          </Text>
        </View>
        <Text style={styles.dateText}>
          {new Date(detail.created_at).toLocaleDateString()}
        </Text>
      </View>

      {/* Listing */}
      {detail.listing && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Listing</Text>
          <Text style={styles.listingTitle}>{detail.listing.title}</Text>
          <Text style={styles.listingMeta}>
            ${detail.listing.monthly_rent}/mo · {detail.listing.neighborhood}
          </Text>
          <Text style={styles.listingMeta}>
            {detail.listing.bedrooms} bd · {detail.listing.bathrooms} ba
          </Text>
        </View>
      )}

      {/* Seeker profile — shown to lister */}
      {isLister && detail.seeker && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>From</Text>
          <Text style={styles.seekerName}>{detail.seeker.full_name}</Text>
          <Text style={styles.seekerMeta}>
            {detail.seeker.major} · Class of {detail.seeker.graduation_year}
          </Text>
          {detail.seeker.bio ? (
            <Text style={styles.seekerBio}>{detail.seeker.bio}</Text>
          ) : null}
        </View>
      )}

      {/* Message */}
      {detail.message ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Message</Text>
          <Text style={styles.messageBody}>{`"${detail.message}"`}</Text>
        </View>
      ) : null}

      {/* Seeker status note */}
      {!isLister && !isAccepted && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Status</Text>
          <Text style={styles.statusNote}>
            {detail.status === "pending"
              ? "Waiting for the lister to respond."
              : detail.status === "declined"
              ? "Your request was declined."
              : STATUS_LABEL[detail.status]}
          </Text>
        </View>
      )}

      {/* Lister: Accept / Decline (pending only) */}
      {isLister && isPending && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.acceptBtn, submitting && styles.btnDisabled]}
            onPress={handleAccept}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.acceptBtnText}>Accept</Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.declineBtn, submitting && styles.btnDisabled]}
            onPress={handleDecline}
            disabled={submitting}
          >
            <Text style={styles.declineBtnText}>Decline</Text>
          </Pressable>
        </View>
      )}

      {/* Resolved state note for lister (non-pending) */}
      {isLister && !isPending && !isAccepted && (
        <View style={styles.resolvedNote}>
          <Text style={styles.resolvedNoteText}>
            This request is {STATUS_LABEL[detail.status].toLowerCase()}.
          </Text>
        </View>
      )}

      {/* Message button — both parties when accepted */}
      {isAccepted && (
        <Pressable
          style={[styles.messageBtn, messaging && styles.btnDisabled]}
          onPress={() => void handleMessage()}
          disabled={messaging}
        >
          {messaging ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.messageBtnText}>Message</Text>
          )}
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  content: { padding: 20, gap: 20 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 32,
  },
  backRow: { marginBottom: 4 },
  backLabel: { fontSize: 15, color: "#208AEF", fontWeight: "500" },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 13, fontWeight: "700" },
  dateText: { fontSize: 12, color: "#aaa" },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  listingTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  listingMeta: { fontSize: 14, color: "#555" },
  seekerName: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  seekerMeta: { fontSize: 14, color: "#555" },
  seekerBio: { fontSize: 14, color: "#666", marginTop: 4 },
  messageBody: {
    fontSize: 14,
    color: "#555",
    fontStyle: "italic",
    lineHeight: 20,
  },
  statusNote: { fontSize: 14, color: "#555" },
  actions: { gap: 12, marginTop: 8 },
  acceptBtn: {
    backgroundColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  acceptBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  declineBtn: {
    borderWidth: 2,
    borderColor: "#ccc",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  declineBtnText: { color: "#555", fontSize: 16, fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },
  resolvedNote: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  resolvedNoteText: { fontSize: 14, color: "#888" },
  messageBtn: {
    backgroundColor: "#10b981",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  messageBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  errorText: { fontSize: 15, color: "#dc2626", textAlign: "center" },
  backBtn: {
    backgroundColor: "#208AEF",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  backBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
