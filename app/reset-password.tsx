import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Field, Texture } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth";
import { useThemedStyles, type Palette } from "@/lib/theme";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { updatePassword, signOut } = useAuth();
  const styles = useThemedStyles(makeStyles);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setDone(true);
      // Sign out so they re-authenticate with the new password.
      await signOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update your password.");
      setBusy(false);
    }
  };

  return (
    <View style={styles.fill}>
      <Texture />
      <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.cardShadow}>
              <View style={styles.card}>
                <Text style={styles.title}>Choose a new password</Text>
                {done ? (
                  <>
                    <Text style={styles.body}>Your password has been updated. Sign in with your new password.</Text>
                    <Button label="Go to sign in" onPress={() => router.replace("/(auth)/sign-in")} />
                  </>
                ) : (
                  <>
                    <Field
                      label="NEW PASSWORD"
                      placeholder="••••••••"
                      value={password}
                      onChangeText={setPassword}
                      autoCapitalize="none"
                      secureTextEntry
                    />
                    <Field
                      label="CONFIRM PASSWORD"
                      placeholder="••••••••"
                      value={confirm}
                      onChangeText={setConfirm}
                      autoCapitalize="none"
                      secureTextEntry
                    />
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    <Button label="Update password" onPress={onSubmit} loading={busy} />
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
    scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 36 },
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
    error: { color: Star.danger, fontSize: 13, fontWeight: "700" },
  });
