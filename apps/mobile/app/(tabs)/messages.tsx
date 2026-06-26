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
import { useAuth } from "@/context/AuthContext";
import { getMyConversations, type ConversationItem } from "@/lib/messages";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MessagesScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [convos, setConvos] = useState<ConversationItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setFetching(true);
    setError(null);
    try {
      setConvos(await getMyConversations(profile.id));
    } catch (e: unknown) {
      if (__DEV__) console.error("[MessagesTab] load error:", e instanceof Error ? e.message : String(e));
      setError("Couldn't load messages.");
    } finally {
      setFetching(false);
    }
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
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : convos.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyText}>
            Accept or get an accepted request to start messaging.
          </Text>
        </View>
      ) : (
        <FlatList
          data={convos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/message/${item.id}?returnTo=/(tabs)/messages` as Parameters<typeof router.push>[0])}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.other_party_name ?? "?").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.nameText} numberOfLines={1}>
                    {item.other_party_name ?? "Unknown"}
                  </Text>
                  {item.last_message_at && (
                    <Text style={styles.timeText}>
                      {formatTime(item.last_message_at)}
                    </Text>
                  )}
                </View>
                <Text style={styles.listingText} numberOfLines={1}>
                  {item.listing_title ?? "Listing"}
                </Text>
                {item.last_message_body ? (
                  <Text style={styles.previewText} numberOfLines={1}>
                    {item.last_message_body}
                  </Text>
                ) : (
                  <Text style={styles.noMsgText}>No messages yet</Text>
                )}
              </View>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
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
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#1a1a1a" },
  list: { paddingTop: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#1d4ed8" },
  rowBody: { flex: 1, gap: 2 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nameText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    marginRight: 8,
  },
  timeText: { fontSize: 12, color: "#aaa" },
  listingText: { fontSize: 13, color: "#888" },
  previewText: { fontSize: 13, color: "#555" },
  noMsgText: { fontSize: 13, color: "#bbb", fontStyle: "italic" },
  separator: { height: 1, backgroundColor: "#f3f4f6", marginLeft: 72 },
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
