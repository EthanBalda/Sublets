import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { useAuth } from "@/context/AuthContext";
import type { ProfileRole } from "@sublets/shared/types";

const ROLE_LABEL: Record<ProfileRole, string> = {
  seeker: "Seeker",
  lister: "Lister",
  both: "Seeker & Lister",
};

export default function AccountScreen() {
  const { profile, session, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => void signOut(),
      },
    ]);
  }

  if (!profile) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Profile unavailable.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <Text style={styles.headerTitle}>Account</Text>

      <View style={styles.profileSection}>
        <Text style={styles.name}>{profile.full_name}</Text>
        {session?.user.email ? (
          <Text style={styles.email}>{session.user.email}</Text>
        ) : null}
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{ROLE_LABEL[profile.role]}</Text>
        </View>
      </View>

      <View style={styles.card}>
        {profile.major ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Major</Text>
            <Text style={styles.rowValue}>{profile.major}</Text>
          </View>
        ) : null}
        {profile.graduation_year ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Graduation</Text>
            <Text style={styles.rowValue}>Class of {profile.graduation_year}</Text>
          </View>
        ) : null}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Campus</Text>
          <Text style={styles.rowValue}>UC San Diego</Text>
        </View>
      </View>

      <Pressable
        style={styles.outgoingBtn}
        onPress={() => router.push("/my-requests")}
      >
        <Text style={styles.outgoingBtnText}>My Sent Requests →</Text>
      </Pressable>

      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Log Out</Text>
      </Pressable>

      <Text style={styles.versionText}>
        Sublets v{Constants.expoConfig?.version ?? "—"}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  content: { gap: 16, paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#1a1a1a", marginBottom: 4 },
  profileSection: { gap: 6 },
  name: { fontSize: 22, fontWeight: "700", color: "#1a1a1a" },
  email: { fontSize: 15, color: "#666" },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e0f0ff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 2,
  },
  roleText: { fontSize: 13, fontWeight: "600", color: "#1560a8" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { fontSize: 14, color: "#888", fontWeight: "500" },
  rowValue: { fontSize: 14, color: "#1a1a1a", fontWeight: "600" },
  outgoingBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  outgoingBtnText: { fontSize: 15, fontWeight: "600", color: "#208AEF" },
  logoutBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  logoutBtnText: { fontSize: 15, fontWeight: "600", color: "#dc2626" },
  errorText: { fontSize: 15, color: "#dc2626" },
  versionText: { fontSize: 12, color: "#bbb", textAlign: "center", marginTop: 4 },
});
