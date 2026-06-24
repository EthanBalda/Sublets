import { useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/context/AuthContext";

function AuthGate() {
  const { loading, session, profile } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "(onboarding)";

    if (!session) {
      console.log("[AuthGate] no session → login");
      if (!inAuth) router.replace("/(auth)/login");
    } else if (!profile?.is_onboarded) {
      console.log("[AuthGate] session but not onboarded → onboarding");
      if (!inOnboarding) router.replace("/(onboarding)");
    } else {
      // Only redirect away from auth/onboarding — allow any other authenticated route
      // (e.g. /request/[id], /my-requests) without forcing back to tabs.
      if (inAuth || inOnboarding) {
        console.log("[AuthGate] authenticated + onboarded → tabs");
        router.replace("/(tabs)");
      }
    }
  }, [loading, session, profile, segments, router]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#208AEF" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#888",
  },
});
