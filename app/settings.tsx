import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar, initialsFrom } from "@/components/avatar";
import { Card, IconButton, Texture } from "@/components/ui/kit";
import { deleteAccount } from "@/lib/account";
import { useAuth } from "@/lib/auth";
import { pickAndUploadAvatar } from "@/lib/avatar";
import { getProfileScreen, updateMyProfile, type ProfileScreenData } from "@/lib/lists";
import { useTheme, useThemeControls, useThemedStyles, type Palette } from "@/lib/theme";
import { useFocusQuery } from "@/lib/use-focus-query";

const BIO_LIMIT = 160;

export default function SettingsScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { themeKey, setTheme, themes } = useThemeControls();
  const { data, loading } = useFocusQuery<ProfileScreenData | null>(() =>
    session ? getProfileScreen(session.user.id) : Promise.resolve(null),
  );

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Seed the form once the profile loads.
  useEffect(() => {
    if (!data) return;
    setDisplayName(data.profile.display_name ?? "");
    setBio(data.profile.bio ?? "");
    setCity(data.profile.city ?? "");
  }, [data]);

  const profile = data?.profile;
  const dirty =
    !!profile &&
    (displayName.trim() !== (profile.display_name ?? "") ||
      bio.trim() !== (profile.bio ?? "") ||
      city.trim() !== (profile.city ?? ""));

  const onPickAvatar = async () => {
    if (!session || uploading) return;
    setError(null);
    setUploading(true);
    try {
      const url = await pickAndUploadAvatar(session.user.id);
      if (url) setLocalAvatar(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update photo.");
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    if (!session || !dirty || saving) return;
    setError(null);
    setSavedNote(null);
    setSaving(true);
    try {
      await updateMyProfile(session.user.id, {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        city: city.trim() || null,
      });
      setSavedNote("Profile saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  const onSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  const [deleting, setDeleting] = useState(false);

  const onDeleteAccount = () => {
    if (deleting) return;
    Alert.alert(
      "Delete account",
      "This permanently deletes your account, all your lists, and your saved places. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
              // signOut inside deleteAccount flips the auth guard back to sign-in.
            } catch (e) {
              setDeleting(false);
              Alert.alert("Couldn't delete account", e instanceof Error ? e.message : "Please try again.");
            }
          },
        },
      ],
    );
  };

  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <View style={styles.root}>
      <Texture />
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <IconButton icon="chevron-back" onPress={() => router.back()} accessibilityLabel="Back" />
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      {loading || !profile ? (
        <ActivityIndicator color={Star.ink} style={styles.loader} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          {/* Edit profile */}
          <Text style={styles.sectionTitle}>Profile</Text>
          <Card style={styles.card}>
            <View style={styles.avatarRow}>
              <Pressable onPress={onPickAvatar} disabled={uploading} style={styles.avatarWrap}>
                <Avatar url={localAvatar ?? profile.avatar_url} initials={initialsFrom(profile.display_name, profile.username)} size={64} />
                <View style={styles.cameraBadge}>
                  {uploading ? <ActivityIndicator size="small" color={Star.surface} /> : <Ionicons name="camera" size={13} color={Star.surface} />}
                </View>
              </Pressable>
              <View style={styles.flex}>
                <Text style={styles.avatarHint}>Tap the photo to change it</Text>
                {profile.username ? <Text style={styles.handle}>@{profile.username}</Text> : null}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display name</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={Star.textMuted}
                style={styles.input}
                maxLength={50}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>City</Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="Where you're based"
                placeholderTextColor={Star.textMuted}
                style={styles.input}
                maxLength={60}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Bio</Text>
                <Text style={styles.counter}>
                  {bio.length}/{BIO_LIMIT}
                </Text>
              </View>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="A line about you and the places you love"
                placeholderTextColor={Star.textMuted}
                style={[styles.input, styles.inputMultiline]}
                multiline
                maxLength={BIO_LIMIT}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {savedNote ? <Text style={styles.savedText}>{savedNote}</Text> : null}

            <Pressable
              onPress={onSave}
              disabled={!dirty || saving}
              style={({ pressed }) => [styles.saveBtn, (!dirty || saving) && styles.saveBtnDisabled, pressed && styles.pressedBtn]}
            >
              {saving ? <ActivityIndicator color={Star.pop} /> : <Text style={styles.saveBtnText}>Save changes</Text>}
            </Pressable>
          </Card>

          {/* Appearance */}
          <Text style={styles.sectionTitle}>Appearance</Text>
          <Card style={styles.card}>
            <Text style={styles.label}>Theme</Text>
            <View style={styles.themeRow}>
              {themes.map((t) => {
                const active = t.key === themeKey;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => setTheme(t.key)}
                    style={[styles.swatch, { backgroundColor: t.palette.base }, active && styles.swatchActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.name} theme`}
                    accessibilityState={{ selected: active }}
                  >
                    <View style={[styles.swatchDot, { backgroundColor: t.palette.pop }]} />
                    {active ? (
                      <View style={styles.swatchCheck}>
                        <Ionicons name="checkmark" size={12} color={Star.surface} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Account (with app version) */}
          <Text style={styles.sectionTitle}>Account</Text>
          <Card style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color={Star.ink} />
              <View style={styles.flex}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{session?.user.email ?? "—"}</Text>
              </View>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color={Star.ink} />
              <View style={styles.flex}>
                <Text style={styles.infoLabel}>Member since</Text>
                <Text style={styles.infoValue}>{new Date(profile.created_at).toLocaleDateString()}</Text>
              </View>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.infoRow}>
              <Ionicons name="sparkles-outline" size={18} color={Star.ink} />
              <View style={styles.flex}>
                <Text style={styles.infoLabel}>Version</Text>
                <Text style={styles.infoValue}>KnowWhere {version}</Text>
              </View>
            </View>
          </Card>

          {/* Legal + account actions in one list */}
          <Text style={styles.sectionTitle}>More</Text>
          <Card style={styles.card}>
            <Pressable onPress={() => router.push("/legal/privacy")} style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={Star.ink} />
              <Text style={styles.linkText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={18} color={Star.textMuted} />
            </Pressable>
            <View style={styles.rowDivider} />
            <Pressable onPress={() => router.push("/legal/terms")} style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}>
              <Ionicons name="document-text-outline" size={18} color={Star.ink} />
              <Text style={styles.linkText}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={18} color={Star.textMuted} />
            </Pressable>
            <View style={styles.rowDivider} />
            <Pressable onPress={onSignOut} style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}>
              <Ionicons name="log-out-outline" size={18} color={Star.ink} />
              <Text style={styles.linkText}>Sign out</Text>
            </Pressable>
            <View style={styles.rowDivider} />
            <Pressable
              onPress={onDeleteAccount}
              disabled={deleting}
              style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
              accessibilityLabel="Delete account"
            >
              {deleting ? (
                <ActivityIndicator color={Star.danger} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color={Star.danger} />
                  <Text style={[styles.linkText, styles.deleteText]}>Delete account</Text>
                </>
              )}
            </Pressable>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (Star: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: Star.base },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerSpacer: { width: 42, height: 42 },
  pressed: { opacity: 0.6 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "900", color: Star.ink, letterSpacing: -0.3 },
  loader: { marginTop: 40 },
  scroll: { padding: 20, paddingBottom: 40, gap: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: Star.ink, letterSpacing: 0.4, textTransform: "uppercase", marginTop: 8, marginBottom: 2 },
  card: { gap: 14 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarWrap: { position: "relative" },
  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Star.ink,
    borderWidth: 2,
    borderColor: Star.surface,
  },
  avatarHint: { fontSize: 14, fontWeight: "700", color: Star.ink },
  handle: { fontSize: 13, fontWeight: "700", color: Star.pop, marginTop: 2 },
  inputGroup: { gap: 6 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 12, fontWeight: "800", color: Star.ink, letterSpacing: 0.8, textTransform: "uppercase" },
  counter: { fontSize: 12, fontWeight: "700", color: Star.textMuted },
  input: {
    backgroundColor: Star.surface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Star.ink,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
    color: Star.text,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  errorText: { fontSize: 13, fontWeight: "700", color: Star.danger },
  savedText: { fontSize: 13, fontWeight: "700", color: Star.pop },
  saveBtn: {
    backgroundColor: Star.ink,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { opacity: 0.4 },
  pressedBtn: { transform: [{ translateY: 2 }], opacity: 0.95 },
  saveBtnText: { color: Star.pop, fontSize: 16, fontWeight: "900", letterSpacing: 0.3 },
  themeRow: { flexDirection: "row", justifyContent: "space-between" },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: Star.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchActive: { borderWidth: 3.5 },
  swatchDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: Star.ink },
  swatchCheck: {
    position: "absolute",
    top: -7,
    right: -7,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Star.ink,
    borderWidth: 2,
    borderColor: Star.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 2 },
  linkText: { flex: 1, fontSize: 15, fontWeight: "700", color: Star.ink },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoLabel: { fontSize: 12, fontWeight: "700", color: Star.textMuted },
  infoValue: { fontSize: 15, fontWeight: "700", color: Star.ink, marginTop: 1 },
  rowDivider: { height: 1.5, backgroundColor: "rgba(20,18,16,0.1)" },
  deleteText: { color: Star.danger, fontWeight: "800" },
});
