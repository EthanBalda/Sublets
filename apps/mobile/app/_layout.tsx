import { useEffect } from "react";
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
      if (!inAuth) router.replace("/(auth)/login");
    } else if (!profile?.is_onboarded) {
      if (!inOnboarding) router.replace("/(onboarding)");
    } else {
      // Only redirect away from auth/onboarding — allow any other authenticated route
      // (e.g. /request/[id], /my-requests) without forcing back to tabs.
      if (inAuth || inOnboarding) router.replace("/(tabs)");
    }
  }, [loading, session, profile, segments, router]);

  if (loading) return null;

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
