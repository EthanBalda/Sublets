import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

function useTabBadges(profileId: string | null | undefined) {
  const [requestsBadge, setRequestsBadge] = useState(0);
  const [messagesBadge, setMessagesBadge] = useState(0);

  useEffect(() => {
    if (!profileId) return;
    const id: string = profileId;

    async function refresh() {
      try {
        const [pendingInRes, acceptedOutRes] = await Promise.all([
          supabase
            .from("interest_requests")
            .select("id", { count: "exact", head: true })
            .eq("lister_id", id)
            .eq("status", "pending"),
          supabase
            .from("interest_requests")
            .select("id", { count: "exact", head: true })
            .eq("seeker_id", id)
            .eq("status", "accepted"),
        ]);
        setRequestsBadge((pendingInRes.count ?? 0) + (acceptedOutRes.count ?? 0));

        const { data: convos } = await supabase
          .from("conversations")
          .select("id")
          .or(`seeker_id.eq.${id},lister_id.eq.${id}`);

        if (convos && convos.length > 0) {
          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .in("conversation_id", convos.map((c) => c.id))
            .neq("sender_id", id)
            .is("read_at", null);
          setMessagesBadge(count ?? 0);
        } else {
          setMessagesBadge(0);
        }
      } catch (e) {
        if (__DEV__) console.warn("[TabBadges] refresh error:", e);
      }
    }

    void refresh();
    const timer = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(timer);
  }, [profileId]);

  return { requestsBadge, messagesBadge };
}

export default function TabsLayout() {
  const { profile } = useAuth();
  const { requestsBadge, messagesBadge } = useTabBadges(profile?.id);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#208AEF",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#f0f0f0",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "compass" : "compass-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          tabBarBadge: requestsBadge > 0 ? requestsBadge : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "file-tray" : "file-tray-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarBadge: messagesBadge > 0 ? messagesBadge : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={
                focused
                  ? "chatbubble-ellipses"
                  : "chatbubble-ellipses-outline"
              }
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="my-listings"
        options={{
          title: "Listings",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
