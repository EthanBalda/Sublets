import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { navigateBack } from "@/lib/navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { getMessages, markMessagesRead, sendMessage, type ThreadMessage } from "@/lib/messages";
import { supabase } from "@/lib/supabase";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessageThreadScreen() {
  const { id: conversationId, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  function goBack() {
    navigateBack(
      router,
      navigation,
      returnTo,
      "/(tabs)/messages" as Parameters<typeof router.replace>[0]
    );
  }

  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [listingId, setListingId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const flatListRef = useRef<FlatList<ThreadMessage>>(null);

  const load = useCallback(async () => {
    if (!conversationId || !profile) return;
    try {
      const [msgs, convoRes] = await Promise.all([
        getMessages(conversationId),
        supabase
          .from("conversations")
          .select("listing_id")
          .eq("id", conversationId)
          .maybeSingle(),
      ]);
      setMessages(msgs);
      setListingId(convoRes.data?.listing_id ?? null);
      // Mark incoming messages as read (best-effort, silent).
      void markMessagesRead(conversationId, profile.id).catch(() => {});
    } catch {
      // Silently retry on focus.
    } finally {
      setFetching(false);
    }
  }, [conversationId, profile]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Scroll to bottom after messages update.
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [messages.length]);

  async function handleSend() {
    if (!profile || !conversationId || sending) return;
    const text = body.trim();
    if (!text) return;

    setSending(true);
    setBody("");

    try {
      await sendMessage(conversationId, profile.id, text);
      await load();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Couldn't send message.");
      setBody(text); // restore on failure
    } finally {
      setSending(false);
    }
  }

  if (fetching) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  const myId = profile?.id;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={goBack}>
            <Text style={styles.backText}>← Messages</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Conversation</Text>
          {listingId ? (
            <Pressable
              onPress={() =>
                router.push(
                  `/listings/${listingId}` as Parameters<typeof router.push>[0]
                )
              }
            >
              <Text style={styles.viewListingLink}>Listing</Text>
            </Pressable>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.messageList,
            messages.length === 0 && styles.messageListEmpty,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.sender_id === myId;
            return (
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
                  {item.body}
                </Text>
                <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
                  {formatTime(item.created_at)}
                </Text>
              </View>
            );
          }}
        />

        {/* Input */}
        <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.input}
            placeholder="Message…"
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={2000}
            editable={!sending}
            returnKeyType="default"
          />
          <Pressable
            style={[styles.sendBtn, (!body.trim() || sending) && styles.sendBtnDisabled]}
            onPress={() => void handleSend()}
            disabled={!body.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendBtnText}>Send</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  backBtn: { minWidth: 60 },
  backText: { fontSize: 15, color: "#208AEF", fontWeight: "600" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  headerSpacer: { minWidth: 60 },
  viewListingLink: { fontSize: 13, color: "#208AEF", fontWeight: "600", minWidth: 60, textAlign: "right" },
  messageList: { padding: 16, gap: 8 },
  messageListEmpty: { flex: 1 },
  emptyWrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 14, color: "#aaa" },
  bubble: {
    maxWidth: "75%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
  },
  bubbleMe: {
    alignSelf: "flex-end",
    backgroundColor: "#208AEF",
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMe: { color: "#fff" },
  bubbleTextThem: { color: "#1a1a1a" },
  bubbleTime: { fontSize: 11 },
  bubbleTimeMe: { color: "rgba(255,255,255,0.7)", textAlign: "right" },
  bubbleTimeThem: { color: "#aaa" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1a1a1a",
    maxHeight: 120,
  },
  sendBtn: {
    backgroundColor: "#208AEF",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
  },
  sendBtnDisabled: { backgroundColor: "#93c5fd" },
  sendBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
