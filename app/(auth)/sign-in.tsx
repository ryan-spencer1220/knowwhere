import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { Texture } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";

type Mode = "sign-in" | "sign-up";
type FieldName = "name" | "username" | "email" | "password";

export default function SignInScreen() {
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [mode, setMode] = useState<Mode>("sign-in");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<FieldName | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignUp = mode === "sign-up";

  // Accordion animation for the sign-up-only fields (Name + Username): keep them
  // mounted and animate height + opacity so the card grows/shrinks smoothly.
  const signupProgress = useSharedValue(0);
  const [signupHeight, setSignupHeight] = useState(0);

  useEffect(() => {
    signupProgress.value = withTiming(isSignUp ? 1 : 0, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [isSignUp, signupProgress]);

  const signupAnimatedStyle = useAnimatedStyle(() => ({
    height: signupProgress.value * signupHeight,
    opacity: signupProgress.value,
    // Cancel the card's 16px gap above this row while collapsed.
    marginTop: (signupProgress.value - 1) * 16,
  }));

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async () => {
    setError(null);
    setNotice(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Email and password are required.");
      return;
    }

    const normalizedUsername = username.trim().toLowerCase();
    if (isSignUp) {
      if (!normalizedUsername) {
        setError("Pick a username.");
        return;
      }
      if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
        setError("Username must be 3–20 letters, numbers, or underscores.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const { needsEmailConfirmation } = await signUp(trimmedEmail, password, {
          displayName: displayName.trim() || undefined,
          username: normalizedUsername,
        });
        if (needsEmailConfirmation) {
          setNotice("Check your email to confirm your account, then sign in.");
          setMode("sign-in");
          setPassword("");
        }
      } else {
        await signIn(trimmedEmail, password);
      }
      // On success the auth listener swaps the navigator to the tabs.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.fill}>
      <StatusBar style="dark" />
      <Texture />

      <SafeAreaView style={styles.flexBare} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={styles.flexBare} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Hero */}
            <View style={styles.hero}>
              <View style={styles.logoBadge}>
                <Ionicons name="star" size={34} color={Star.pop} />
              </View>
              <Text style={styles.wordmark}>KnowWhere</Text>
              <Text style={styles.tagline}>save the spots you love ★</Text>
            </View>

            {/* Chunky card (the Name row animates its height to grow/shrink the card) */}
            <View style={styles.cardShadow}>
              <View style={styles.card}>
                <View style={styles.segment}>
                  {(["sign-in", "sign-up"] as const).map((value) => {
                    const active = mode === value;
                    return (
                      <Pressable
                        key={value}
                        onPress={() => switchMode(value)}
                        style={[styles.segmentItem, active && styles.segmentItemActive]}
                      >
                        <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                          {value === "sign-in" ? "Sign in" : "Sign up"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Animated.View style={[styles.nameCollapse, signupAnimatedStyle]} pointerEvents={isSignUp ? "auto" : "none"}>
                  <View style={styles.collapseInner} onLayout={(e) => setSignupHeight(e.nativeEvent.layout.height)}>
                    <Field
                      label="NAME"
                      placeholder="Your name"
                      value={displayName}
                      onChangeText={setDisplayName}
                      autoCapitalize="words"
                      focused={focused === "name"}
                      onFocus={() => setFocused("name")}
                      onBlur={() => setFocused(null)}
                    />
                    <Field
                      label="USERNAME"
                      placeholder="username"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                      leftSlot={<Text style={styles.atPrefix}>@</Text>}
                      focused={focused === "username"}
                      onFocus={() => setFocused("username")}
                      onBlur={() => setFocused(null)}
                    />
                  </View>
                </Animated.View>

                <Field
                  label="EMAIL"
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  focused={focused === "email"}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                />

                <Field
                  label="PASSWORD"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  secureTextEntry={!showPassword}
                  focused={focused === "password"}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  rightSlot={
                    <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={Star.textMuted} />
                    </Pressable>
                  }
                />

                {!isSignUp ? (
                  <Pressable onPress={() => router.push("/(auth)/forgot-password")} hitSlop={6} style={styles.forgotWrap}>
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </Pressable>
                ) : null}

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}

                <Pressable
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={Star.pop} />
                  ) : (
                    <Text style={styles.ctaText}>{isSignUp ? "Create account" : "Let's go"}</Text>
                  )}
                </Pressable>

                <Text style={styles.legalText}>
                  By continuing you agree to our{" "}
                  <Text style={styles.legalLink} onPress={() => router.push("/legal/terms")}>
                    Terms
                  </Text>{" "}
                  and{" "}
                  <Text style={styles.legalLink} onPress={() => router.push("/legal/privacy")}>
                    Privacy Policy
                  </Text>
                  .
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  focused: boolean;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
};

function Field({ label, focused, leftSlot, rightSlot, style, ...inputProps }: FieldProps) {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.field, focused && styles.fieldFocused]}>
        {leftSlot}
        <TextInput placeholderTextColor={Star.textMuted} style={[styles.fieldInput, style]} {...inputProps} />
        {rightSlot}
      </View>
    </View>
  );
}

const makeStyles = (Star: Palette) => StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: Star.base,
  },
  flexBare: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  hero: {
    alignItems: "center",
    marginBottom: 26,
  },
  logoBadge: {
    width: 66,
    height: 66,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Star.ink,
    marginBottom: 16,
  },
  wordmark: {
    color: Star.ink,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1,
  },
  tagline: {
    color: Star.ink,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
  },
  // Hard offset shadow behind the card (neo / DaisyUI-retro feel).
  cardShadow: {
    borderRadius: 26,
    backgroundColor: Star.ink,
    shadowColor: Star.ink,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 6, height: 7 },
    elevation: 8,
  },
  card: {
    backgroundColor: Star.surface,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: Star.ink,
    padding: 20,
    gap: 16,
    // Pull the card up-left so the ink layer peeks as a hard shadow.
    transform: [{ translateX: -3 }, { translateY: -4 }],
  },
  segment: {
    flexDirection: "row",
    backgroundColor: Star.blush,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Star.ink,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 9,
  },
  segmentItemActive: {
    backgroundColor: Star.ink,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: "800",
    color: Star.ink,
  },
  segmentTextActive: {
    color: Star.pop,
  },
  nameCollapse: {
    overflow: "hidden",
  },
  collapseInner: {
    // Absolutely positioned so it always measures its natural height, even
    // while the clipping parent is animated to height 0 (native clamps an
    // in-flow child to the parent height, which would break the measurement).
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  atPrefix: {
    fontSize: 16,
    fontWeight: "700",
    color: Star.textMuted,
  },
  fieldLabel: {
    color: Star.ink,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Star.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 8,
    borderWidth: 2,
    borderColor: Star.ink,
  },
  fieldFocused: {
    borderColor: Star.pop,
    backgroundColor: Star.blush,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: Star.text,
  },
  errorText: {
    color: Star.danger,
    fontSize: 13,
    fontWeight: "700",
  },
  noticeText: {
    color: Star.pop,
    fontSize: 13,
    fontWeight: "700",
  },
  cta: {
    marginTop: 2,
    backgroundColor: Star.ink,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPressed: {
    transform: [{ translateY: 2 }],
    opacity: 0.95,
  },
  ctaText: {
    color: Star.pop,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  forgotWrap: { alignSelf: "flex-end", marginTop: -6 },
  forgotText: { color: Star.pop, fontSize: 13, fontWeight: "800" },
  legalText: { fontSize: 12, fontWeight: "500", color: Star.textMuted, textAlign: "center", lineHeight: 18, marginTop: -4 },
  legalLink: { color: Star.pop, fontWeight: "800" },
});
