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
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { navigateBack } from "@/lib/navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getOrCreateConversationForAcceptedRequest } from "@/lib/messages";
import type { InterestRequestStatus, Tables } from "@sublets/shared/types";

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

type ChecklistItem = {
  id: string;
  key: string;
  label: string;
  completed_by_seeker: boolean;
  completed_by_lister: boolean;
};

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
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  function goBack() {
    navigateBack(
      router,
      navigation,
      returnTo,
      "/(tabs)/requests" as Parameters<typeof router.replace>[0]
    );
  }

  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [togglingItem, setTogglingItem] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

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

    // Fetch checklist for accepted/completed requests.
    if (req.status === "accepted" || req.status === "completed") {
      const { data: items, error: itemsErr } = await supabase
        .from("sublet_checklist_items")
        .select("id, key, label, completed_by_seeker, completed_by_lister")
        .eq("interest_request_id", req.id)
        .order("created_at", { ascending: true });
      if (itemsErr) {
        setChecklistError("Couldn't load checklist.");
      } else {
        setChecklistItems(items ?? []);
        setChecklistError(null);
      }
    } else {
      setChecklistItems([]);
      setChecklistError(null);
    }

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
        Alert.alert(
          "Accepted",
          "Request accepted, but checklist setup failed. It can be retried."
        );
      }
    }

    setSubmitting(false);
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

  // Either participant can open/create the conversation once the request is
  // accepted. getOrCreateConversationForAcceptedRequest handles both roles.
  async function handleMessage() {
    if (!detail || !profile || messaging) return;
    setMessaging(true);
    try {
      const convId = await getOrCreateConversationForAcceptedRequest(
        detail.listing_id,
        detail.seeker_id,
        detail.lister_id
      );
      router.push(`/message/${convId}`);
    } catch (e: unknown) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "Couldn't open messages."
      );
    } finally {
      setMessaging(false);
    }
  }

  async function handleToggleItem(item: ChecklistItem) {
    if (!profile || !detail || togglingItem) return;
    if (detail.status !== "accepted") return;

    const isSeeker = detail.seeker_id === profile.id;
    const patch = isSeeker
      ? { completed_by_seeker: !item.completed_by_seeker }
      : { completed_by_lister: !item.completed_by_lister };

    // Optimistic update.
    setChecklistItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i))
    );
    setTogglingItem(item.id);

    const { error } = await supabase
      .from("sublet_checklist_items")
      .update(patch)
      .eq("id", item.id);

    if (error) {
      // Roll back.
      setChecklistItems((prev) =>
        prev.map((i) => (i.id === item.id ? item : i))
      );
      Alert.alert("Error", "Couldn't update checklist. Try again.");
    }

    setTogglingItem(null);
  }

  async function handleCompleteRequest() {
    if (!detail || !profile || completing) return;
    if (detail.lister_id !== profile.id) return;

    Alert.alert(
      "Mark as completed?",
      "This records the sublet as done and marks the listing as filled. It can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Completed",
          onPress: async () => {
            setCompleting(true);
            const now = new Date().toISOString();

            const { error: reqErr } = await supabase
              .from("interest_requests")
              .update({ status: "completed", completed_at: now })
              .eq("id", detail.id);

            if (reqErr) {
              Alert.alert("Error", reqErr.message);
              setCompleting(false);
              return;
            }

            await supabase
              .from("listings")
              .update({ status: "filled", filled_at: now })
              .eq("id", detail.listing_id);

            setCompleting(false);
            await load();
          },
        },
      ]
    );
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
        <Pressable style={styles.backBtn} onPress={goBack}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isLister = detail.lister_id === profile?.id;
  const isPending = detail.status === "pending";
  const isAccepted = detail.status === "accepted";
  const showChecklist = isAccepted || detail.status === "completed";
  const allItemsDone =
    checklistItems.length > 0 &&
    checklistItems.every((i) => i.completed_by_seeker && i.completed_by_lister);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
      ]}
    >
      {/* 1. Back */}
      <Pressable style={styles.backRow} onPress={goBack}>
        <Text style={styles.backLabel}>← Back</Text>
      </Pressable>

      {/* 2. Status badge / date */}
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

      {/* 3. Listing card */}
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
          <Pressable
            onPress={() =>
              router.push(
                `/listings/${detail.listing_id}?returnTo=/request/${detail.id}` as Parameters<typeof router.push>[0]
              )
            }
          >
            <Text style={styles.viewListingLink}>View Listing →</Text>
          </Pressable>
        </View>
      )}

      {/* 4. Other participant profile (seeker info shown to lister) */}
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

      {/* Request message */}
      {detail.message ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Message</Text>
          <Text style={styles.messageBody}>{`"${detail.message}"`}</Text>
        </View>
      ) : null}

      {/* Seeker status note (pending / declined / cancelled) */}
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

      {/* 5. Message button — both parties when accepted */}
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

      {/* 6. Checklist — shown when accepted or completed */}
      {showChecklist && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Checklist</Text>
          {checklistError ? (
            <Text style={styles.checklistErrorText}>{checklistError}</Text>
          ) : checklistItems.length === 0 ? (
            <Text style={styles.checklistEmpty}>
              {isLister
                ? "Checklist not ready. Try accepting again."
                : "Checklist is being set up by the lister."}
            </Text>
          ) : (
            <>
              {checklistItems.map((item) => {
                const myDone = isLister
                  ? item.completed_by_lister
                  : item.completed_by_seeker;
                const theirDone = isLister
                  ? item.completed_by_seeker
                  : item.completed_by_lister;
                const isToggling = togglingItem === item.id;
                const canToggle = isAccepted && !togglingItem;

                return (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.checklistRow,
                      isToggling && styles.checklistRowToggling,
                    ]}
                    onPress={() => canToggle && void handleToggleItem(item)}
                    disabled={!canToggle}
                  >
                    {/* My checkbox */}
                    <View
                      style={[
                        styles.checkbox,
                        myDone && styles.checkboxDone,
                        !isAccepted && styles.checkboxReadOnly,
                      ]}
                    >
                      {myDone && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>

                    <Text
                      style={[
                        styles.checklistLabel,
                        myDone && styles.checklistLabelDone,
                      ]}
                      numberOfLines={2}
                    >
                      {item.label}
                    </Text>

                    {/* Their side indicator */}
                    <View
                      style={[
                        styles.theirIndicator,
                        theirDone && styles.theirIndicatorDone,
                      ]}
                    >
                      <Text
                        style={[
                          styles.theirLabel,
                          theirDone && styles.theirLabelDone,
                        ]}
                      >
                        {theirDone ? "✓" : "·"}{" "}
                        {isLister ? "seeker" : "lister"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}

              <Text style={styles.checklistHint}>
                Tap an item to mark your side complete.
              </Text>
            </>
          )}
        </View>
      )}

      {/* Mark Completed — lister only, accepted, all items done by both */}
      {isLister && isAccepted && checklistItems.length > 0 && (
        <Pressable
          style={[
            styles.completeBtn,
            (!allItemsDone || completing) && styles.btnDisabled,
          ]}
          onPress={() => void handleCompleteRequest()}
          disabled={!allItemsDone || completing}
        >
          {completing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.completeBtnText}>Mark Completed</Text>
              {!allItemsDone && (
                <Text style={styles.completeBtnHint}>
                  Both sides must finish all checklist items first.
                </Text>
              )}
            </>
          )}
        </Pressable>
      )}

      {/* 7. Accept / Decline — lister, pending */}
      {isLister && isPending && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.acceptBtn, submitting && styles.btnDisabled]}
            onPress={() => void handleAccept()}
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
            onPress={() => void handleDecline()}
            disabled={submitting}
          >
            <Text style={styles.declineBtnText}>Decline</Text>
          </Pressable>
        </View>
      )}

      {/* Resolved state note for lister (non-pending, non-accepted) */}
      {isLister && !isPending && !isAccepted && (
        <View style={styles.resolvedNote}>
          <Text style={styles.resolvedNoteText}>
            This request is {STATUS_LABEL[detail.status].toLowerCase()}.
          </Text>
        </View>
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
  viewListingLink: { fontSize: 14, color: "#208AEF", fontWeight: "600", marginTop: 6 },
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
  // Checklist
  checklistErrorText: { fontSize: 14, color: "#dc2626" },
  checklistEmpty: { fontSize: 14, color: "#aaa", fontStyle: "italic" },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  checklistRowToggling: { opacity: 0.5 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkboxDone: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  checkboxReadOnly: {
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  checkmark: { color: "#fff", fontSize: 14, fontWeight: "700" },
  checklistLabel: {
    flex: 1,
    fontSize: 14,
    color: "#1a1a1a",
    lineHeight: 19,
  },
  checklistLabelDone: { color: "#9ca3af", textDecorationLine: "line-through" },
  theirIndicator: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#f3f4f6",
    flexShrink: 0,
  },
  theirIndicatorDone: { backgroundColor: "#d1fae5" },
  theirLabel: { fontSize: 11, color: "#9ca3af", fontWeight: "500" },
  theirLabelDone: { color: "#065f46" },
  checklistHint: { fontSize: 12, color: "#aaa", marginTop: 8 },
  // Buttons
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
  completeBtn: {
    backgroundColor: "#1d4ed8",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  completeBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  completeBtnHint: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  errorText: { fontSize: 15, color: "#dc2626", textAlign: "center" },
  backBtn: {
    backgroundColor: "#208AEF",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  backBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
