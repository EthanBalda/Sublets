import { Redirect } from "expo-router";

// Root URL "/" renders this stub. Always redirect to the tab layout so
// Expo Router doesn't show a blank screen when the app opens at the root path.
// AuthGate inside _layout.tsx handles unauthenticated / not-onboarded redirects
// to /(auth)/login or /(onboarding).
export default function IndexScreen() {
  return <Redirect href="/(tabs)" />;
}
