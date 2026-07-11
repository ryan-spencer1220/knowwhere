import { Ionicons } from "@expo/vector-icons";
import { type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { IconButton, Texture } from "@/components/ui/kit";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";

export type ProfileHeaderProps = {
  avatarUrl: string | null;
  initials: string;
  displayName: string | null;
  username: string | null;
  bio: string | null;
  city: string | null;
  stats: { key: string; label: string; value: number }[];
  uploading?: boolean;
  uploadError?: string | null;
  // When provided the avatar is editable (camera badge + tap to upload).
  onPickAvatar?: () => void;
  onSettings?: () => void;
  onStatPress?: (key: string) => void;
  // Right-hand control on the identity row. Overrides the settings gear — the
  // public profile passes a Follow button here.
  action?: ReactNode;
  // Shown when displayName is null ("You" on your own profile).
  nameFallback?: string;
  // Put the @handle and location on separate lines instead of one inline row
  // (the public profile stacks them so the Follow button doesn't crowd them).
  stackMeta?: boolean;
  // Override the safe-area top padding (0 when a nav bar already consumed it).
  topInset?: number;
};

/**
 * Full-bleed colored identity header. Spans edge-to-edge and up under the status
 * bar so the top of the screen reads as one integrated brand-colored surface,
 * with a single chunky ink rule separating it from the white list below. Text
 * sits directly on the mint, so secondary copy uses ink (differentiated by size
 * and weight, not color) to stay legible against the vivid background.
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
  onStatPress,
  action,
  nameFallback = "You",
  stackMeta,
  topInset,
}: ProfileHeaderProps) {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const paddingTop = (topInset ?? insets.top) + 14;

  return (
    <View style={[styles.wrap, { paddingTop }]}>
      <Texture />
      <View style={styles.topRow}>
        {onPickAvatar ? (
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
        ) : (
          <Avatar url={avatarUrl} initials={initials} size={72} />
        )}
        <View style={styles.info}>
          <Text style={styles.name}>{displayName ?? nameFallback}</Text>
          {stackMeta ? (
            <>
              {username ? <Text style={styles.handle}>@{username}</Text> : null}
              {city ? (
                <View style={styles.locRow}>
                  <Ionicons name="location" size={13} color={Star.ink} />
                  <Text style={styles.locText} numberOfLines={1}>
                    {city}
                  </Text>
                </View>
              ) : null}
            </>
          ) : username || city ? (
            <View style={styles.handleRow}>
              {username ? <Text style={styles.handle}>@{username}</Text> : null}
              {username && city ? <Text style={styles.dot}>·</Text> : null}
              {city ? (
                <>
                  <Ionicons name="location" size={13} color={Star.ink} />
                  <Text style={styles.locText} numberOfLines={1}>
                    {city}
                  </Text>
                </>
              ) : null}
            </View>
          ) : null}
        </View>
        {action ? action : onSettings ? <IconButton icon="settings-outline" onPress={onSettings} accessibilityLabel="Settings" /> : null}
      </View>

      {bio ? <Text style={styles.bio}>{bio}</Text> : null}
      {uploadError ? <Text style={styles.errorText}>{uploadError}</Text> : null}

      <View style={styles.statsShadow}>
        <View style={styles.statsBox}>
          {stats.map((stat, i) => (
            <Pressable
              key={stat.key}
              onPress={onStatPress ? () => onStatPress(stat.key) : undefined}
              disabled={!onStatPress}
              accessibilityRole={onStatPress ? "button" : undefined}
              accessibilityLabel={onStatPress ? `${stat.value} ${stat.label}` : undefined}
              style={({ pressed }) => [styles.statCol, i > 0 && styles.statColDivider, pressed && onStatPress ? styles.statPressed : null]}
            >
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (Star: Palette) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: Star.base,
      paddingHorizontal: 20,
      paddingBottom: 18,
      gap: 12,
      overflow: "hidden",
      // Chunky ink rule + a soft drop shadow so the colored panel lifts off the
      // white list below instead of reading as a flat block. The dot Texture
      // behind adds subtle life to the mint.
      borderBottomWidth: 2,
      borderBottomColor: Star.ink,
      shadowColor: Star.ink,
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
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
    info: { flex: 1, gap: 3 },
    handleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    locRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    dot: { fontSize: 14, fontWeight: "800", color: Star.ink },
    locText: { flexShrink: 1, fontSize: 13, fontWeight: "700", color: Star.ink },
    name: { fontSize: 24, fontWeight: "900", color: Star.ink, letterSpacing: -0.5 },
    // Ink (not violet/muted) so it stays legible on the mint; the smaller size
    // and lighter weight carry the hierarchy instead of color.
    handle: { fontSize: 14, fontWeight: "700", color: Star.ink },
    bio: { fontSize: 14, fontWeight: "500", color: Star.ink },
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
    statPressed: { opacity: 0.55 },
    statValue: { fontSize: 24, fontWeight: "900", color: Star.pop },
    statLabel: { fontSize: 12, fontWeight: "700", color: Star.textMuted },
  });
