import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/context/AuthContext";

function AuthGate() {
  const { loading, session, profile, authPhase, authError, retryAuth, signOut } =
    useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [showStuck, setShowStuck] = useState(false);

  // After 8 s of loading, surface recovery UI.
  useEffect(() => {
    if (!loading) {
      setShowStuck(false);
      return;
    }
    const t = setTimeout(() => setShowStuck(true), 8_000);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "(onboarding)";

    if (__DEV__) {
      console.log(
        "[AuthGate] routing — session:", !!session,
        "onboarded:", !!profile?.is_onboarded,
        "path:", segments.join("/") || "/"
      );
    }

    if (!session) {
      if (!inAuth) router.replace("/(auth)/login");
    } else if (!profile?.is_onboarded) {
      if (!inOnboarding) router.replace("/(onboarding)");
    } else {
      // Authenticated + onboarded: leave tabs/stack routes alone.
      // app/index.tsx issues a <Redirect href="/(tabs)" /> which covers root "/".
      if (inAuth || inOnboarding) router.replace("/(tabs)");
    }
  }, [loading, session, profile, segments, router]);

  if (loading) {
    const showPhase =
      !!authPhase &&
      authPhase !== "initializing" &&
      authPhase !== "ready" &&
      authPhase !== "error";

    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#208AEF" />
        <Text style={styles.loadingText}>Loading Sublets…</Text>
        {showPhase && <Text style={styles.phaseText}>{authPhase}</Text>}
        {!!authError && (
          <Text style={styles.errorText}>{authError}</Text>
        )}
        {showStuck && (
          <View style={styles.stuckBox}>
            <Text style={styles.stuckTitle}>
              Still loading. Something may be wrong.
            </Text>
            <Pressable
              style={styles.stuckBtn}
              onPress={() => void retryAuth()}
            >
              <Text style={styles.stuckBtnText}>Retry</Text>
            </Pressable>
            <Pressable
              style={[styles.stuckBtn, styles.stuckBtnAlt]}
              onPress={async () => {
                await signOut();
                router.replace("/(auth)/login");
              }}
            >
              <Text style={styles.stuckBtnAltText}>Log out / Reset session</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
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
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    color: "#888",
  },
  phaseText: {
    fontSize: 12,
    color: "#aaa",
  },
  errorText: {
    fontSize: 12,
    color: "#dc2626",
    textAlign: "center",
  },
  stuckBox: {
    marginTop: 16,
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  stuckTitle: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 4,
  },
  stuckBtn: {
    backgroundColor: "#208AEF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: "100%",
    alignItems: "center",
  },
  stuckBtnAlt: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  stuckBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  stuckBtnAltText: {
    color: "#555",
    fontSize: 14,
    fontWeight: "600",
  },
});
