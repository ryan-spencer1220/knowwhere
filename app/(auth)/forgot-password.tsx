import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Field, Texture } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }
    setBusy(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the reset email.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.fill}>
      <Texture />
      <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={Star.ink} />
          </Pressable>
        </View>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.cardShadow}>
              <View style={styles.card}>
                <Text style={styles.title}>Reset password</Text>
                {sent ? (
                  <>
                    <Text style={styles.body}>
                      If an account exists for <Text style={styles.bodyStrong}>{email.trim()}</Text>, we&apos;ve sent a link to reset your
                      password. Open it on this device to choose a new one.
                    </Text>
                    <Button label="Back to sign in" onPress={() => router.back()} />
                  </>
                ) : (
                  <>
                    <Text style={styles.body}>Enter your email and we&apos;ll send you a link to reset your password.</Text>
                    <Field
                      label="EMAIL"
                      placeholder="you@example.com"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                    />
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    <Button label="Send reset link" onPress={onSubmit} loading={busy} />
                  </>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (Star: Palette) =>
  StyleSheet.create({
    fill: { flex: 1, backgroundColor: Star.base },
    flex: { flex: 1 },
    header: { paddingHorizontal: 12, paddingVertical: 8 },
    backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    pressed: { opacity: 0.6 },
    scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingBottom: 36 },
    cardShadow: { borderRadius: 26, backgroundColor: Star.ink },
    card: {
      backgroundColor: Star.surface,
      borderRadius: 24,
      borderWidth: 2.5,
      borderColor: Star.ink,
      padding: 20,
      gap: 16,
      transform: [{ translateX: -3 }, { translateY: -4 }],
    },
    title: { fontSize: 26, fontWeight: "900", color: Star.ink, letterSpacing: -0.6 },
    body: { fontSize: 15, fontWeight: "500", color: Star.text, lineHeight: 22 },
    bodyStrong: { fontWeight: "800", color: Star.ink },
    error: { color: Star.danger, fontSize: 13, fontWeight: "700" },
  });
