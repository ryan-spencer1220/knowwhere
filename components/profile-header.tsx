import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { Pill } from "@/components/ui/kit";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";

export type ProfileHeaderProps = {
  avatarUrl: string | null;
  initials: string;
  displayName: string | null;
  username: string | null;
  bio: string | null;
  city: string | null;
  stats: { label: string; value: number }[];
  uploading?: boolean;
  uploadError?: string | null;
  onPickAvatar?: () => void;
  onSettings?: () => void;
  // Override the safe-area top padding (used by the design preview on web).
  topInset?: number;
};

/**
 * Full-bleed white identity header for the Profile tab. Unlike the rest of the
 * app's chunky floating cards, this spans edge-to-edge and up under the status
 * bar so the top of the screen reads as one integrated white surface, with a
 * single chunky ink rule separating it from the mint list below.
 */
export function ProfileHeader({
  avatarUrl,
  initials,
  displayName,
  username,
  bio,
  city,
  stats,
  uploading,
  uploadError,
  onPickAvatar,
  onSettings,
  topInset,
}: ProfileHeaderProps) {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const paddingTop = (topInset ?? insets.top) + 14;

  return (
    <View style={[styles.wrap, { paddingTop }]}>
      <View style={styles.topRow}>
        <Pressable onPress={onPickAvatar} disabled={uploading} style={styles.avatarWrap}>
          <Avatar url={avatarUrl} initials={initials} size={72} />
          <View style={styles.cameraBadge}>
            {uploading ? (
              <ActivityIndicator size="small" color={Star.surface} />
            ) : (
              <Ionicons name="camera" size={14} color={Star.surface} />
            )}
          </View>
        </Pressable>
        <View style={styles.info}>
          <Text style={styles.name}>{displayName ?? "You"}</Text>
          {username ? <Text style={styles.handle}>@{username}</Text> : null}
        </View>
        <Pressable
          onPress={onSettings}
          style={({ pressed }) => [styles.settingsBtn, pressed && styles.settingsBtnPressed]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={20} color={Star.ink} />
        </Pressable>
      </View>

      {bio ? <Text style={styles.bio}>{bio}</Text> : null}
      {city ? (
        <View style={styles.pillRow}>
          <Pill icon="location" label={city} />
        </View>
      ) : null}
      {uploadError ? <Text style={styles.errorText}>{uploadError}</Text> : null}

      <View style={styles.statsShadow}>
        <View style={styles.statsBox}>
          {stats.map((stat, i) => (
            <View key={stat.label} style={[styles.statCol, i > 0 && styles.statColDivider]}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (Star: Palette) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: Star.surface,
      paddingHorizontal: 20,
      paddingBottom: 18,
      gap: 14,
      // Chunky ink rule keeps the app's identity while the panel stays flush.
      borderBottomWidth: 2.5,
      borderBottomColor: Star.ink,
    },
    topRow: { flexDirection: "row", alignItems: "center", gap: 16 },
    avatarWrap: { position: "relative" },
    cameraBadge: {
      position: "absolute",
      right: -2,
      bottom: -2,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Star.ink,
      borderWidth: 2,
      borderColor: Star.surface,
    },
    info: { flex: 1, gap: 2 },
    settingsBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Star.base,
      borderWidth: 2,
      borderColor: Star.ink,
    },
    settingsBtnPressed: { opacity: 0.6 },
    name: { fontSize: 24, fontWeight: "900", color: Star.ink, letterSpacing: -0.5 },
    handle: { fontSize: 14, fontWeight: "700", color: Star.pop },
    bio: { fontSize: 14, fontWeight: "500", color: Star.textMuted },
    pillRow: { flexDirection: "row" },
    errorText: { fontSize: 13, fontWeight: "600", color: Star.danger },
    // Lifted stats panel: white card floating on a hard offset shadow tinted
    // with the theme accent, and accent-colored numbers — both follow the
    // user's selected theme via Star.pop.
    statsShadow: { borderRadius: 18, backgroundColor: Star.pop },
    statsBox: {
      flexDirection: "row",
      backgroundColor: Star.surface,
      borderRadius: 16,
      borderWidth: 2.5,
      borderColor: Star.ink,
      paddingVertical: 16,
      transform: [{ translateX: -3 }, { translateY: -4 }],
    },
    statCol: { flex: 1, alignItems: "center", gap: 2 },
    statColDivider: { borderLeftWidth: 2.5, borderLeftColor: Star.ink },
    statValue: { fontSize: 24, fontWeight: "900", color: Star.pop },
    statLabel: { fontSize: 12, fontWeight: "700", color: Star.textMuted },
  });
