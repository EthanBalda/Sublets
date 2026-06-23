import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { SUPPORTED_CAMPUS_DOMAIN } from "@sublets/shared/campus";
import type { ProfileRole } from "@sublets/shared/types";

const ROLES: { value: ProfileRole; label: string }[] = [
  { value: "seeker", label: "Sublet" },
  { value: "lister", label: "List" },
  { value: "both", label: "Both" },
];

export default function OnboardingScreen() {
  const { session, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [major, setMajor] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState<ProfileRole>("seeker");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!fullName.trim() || !major.trim() || !graduationYear.trim()) {
      Alert.alert("Required fields", "Please fill in your name, major, and graduation year.");
      return;
    }

    const gradYear = parseInt(graduationYear, 10);
    if (isNaN(gradYear) || gradYear < 2024 || gradYear > 2035) {
      Alert.alert("Invalid year", "Please enter a valid graduation year (2024–2035).");
      return;
    }

    if (!session?.user.id) return;
    setLoading(true);

    const { data: campus, error: campusError } = await supabase
      .from("campuses")
      .select("id")
      .eq("domain_suffix", SUPPORTED_CAMPUS_DOMAIN)
      .maybeSingle();

    if (campusError || !campus) {
      Alert.alert("Error", "UCSD campus is not configured. Please try again.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: session.user.id,
        campus_id: campus.id,
        full_name: fullName.trim(),
        major: major.trim(),
        graduation_year: gradYear,
        bio: bio.trim(),
        role,
        is_onboarded: true,
        verification_status: "email_verified",
        id_verification_status: "not_started",
      },
      { onConflict: "user_id" }
    );

    if (error) {
      Alert.alert("Error", error.message);
      setLoading(false);
      return;
    }

    await refreshProfile();
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.subtitle}>
          This helps listers know who you are.
        </Text>

        <Text style={styles.label}>Full name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Jane Triton"
          placeholderTextColor="#999"
          autoCapitalize="words"
          value={fullName}
          onChangeText={setFullName}
        />

        <Text style={styles.label}>Major *</Text>
        <TextInput
          style={styles.input}
          placeholder="Computer Science"
          placeholderTextColor="#999"
          value={major}
          onChangeText={setMajor}
        />

        <Text style={styles.label}>Graduation year *</Text>
        <TextInput
          style={styles.input}
          placeholder="2026"
          placeholderTextColor="#999"
          keyboardType="number-pad"
          value={graduationYear}
          onChangeText={setGraduationYear}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="A bit about yourself..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
          value={bio}
          onChangeText={setBio}
        />

        <Text style={styles.label}>I am looking to…</Text>
        <View style={styles.roleRow}>
          {ROLES.map(({ value, label }) => (
            <Pressable
              key={value}
              style={[styles.roleBtn, role === value && styles.roleBtnActive]}
              onPress={() => setRole(value)}
            >
              <Text
                style={[
                  styles.roleBtnText,
                  role === value && styles.roleBtnTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Saving..." : "Get started"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    gap: 8,
  },
  title: { fontSize: 28, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#555", marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: "#1a1a1a",
  },
  multiline: { height: 88, textAlignVertical: "top" },
  roleRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  roleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  roleBtnActive: { borderColor: "#208AEF", backgroundColor: "#EAF4FD" },
  roleBtnText: { fontSize: 15, color: "#555" },
  roleBtnTextActive: { color: "#208AEF", fontWeight: "600" },
  button: {
    backgroundColor: "#208AEF",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
