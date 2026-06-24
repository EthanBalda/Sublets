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

    console.log(
      "[AuthGate] segments:", JSON.stringify(segments),
      "session:", !!session,
      "onboarded:", !!profile?.is_onboarded
    );

    if (!session) {
      if (!inAuth) {
        console.log("[AuthGate] → /(auth)/login");
        router.replace("/(auth)/login");
      }
    } else if (!profile?.is_onboarded) {
      if (!inOnboarding) {
        console.log("[AuthGate] → /(onboarding)");
        router.replace("/(onboarding)");
      }
    } else {
      // Authenticated + onboarded: leave tabs/stack routes alone.
      // app/index.tsx issues a <Redirect href="/(tabs)" /> which covers root "/".
      if (inAuth || inOnboarding) {
        console.log("[AuthGate] → /(tabs)");
        router.replace("/(tabs)");
      }
    }
  }, [loading, session, profile, segments, router]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#208AEF" />
        <Text style={styles.loadingText}>Loading Sublets…</Text>
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  console.log("[RootLayout] render");
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
