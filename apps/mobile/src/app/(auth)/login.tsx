import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { classifyEmail } from "@sublets/shared/campus";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    const trimmedEmail = email.trim().toLowerCase();

    if (classifyEmail(trimmedEmail) !== "ucsd") {
      Alert.alert(
        "UCSD only",
        "Sublets is currently available to UCSD students only. Use your @ucsd.edu email."
      );
      return;
    }

    if (!password) {
      Alert.alert("Required", "Please enter a password.");
      return;
    }

    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (signInError) {
      const isInvalidCreds =
        signInError.message.includes("Invalid login credentials") ||
        signInError.message.includes("invalid_credentials");

      if (isInvalidCreds) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
        });
        if (signUpError) {
          Alert.alert("Error", signUpError.message);
        }
      } else {
        Alert.alert("Error", signInError.message);
      }
    }

    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Sublets</Text>
        <Text style={styles.subtitle}>Sign in with your UCSD email</Text>

        <TextInput
          style={styles.input}
          placeholder="you@ucsd.edu"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Loading..." : "Continue"}
          </Text>
        </Pressable>

        <Text style={styles.hint}>
          New here? Enter your UCSD email and choose a password to create an
          account.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 12,
  },
  title: { fontSize: 32, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 },
  subtitle: { fontSize: 16, color: "#555", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1a1a1a",
  },
  button: {
    backgroundColor: "#208AEF",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  hint: { fontSize: 13, color: "#888", textAlign: "center", marginTop: 8 },
});
