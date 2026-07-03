import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar, initialsFrom } from "@/components/avatar";
import { ListCover } from "@/components/list-cover";
import { Card, ErrorState, Pill, Screen } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";
import { pickAndUploadAvatar } from "@/lib/avatar";
import { getProfileScreen, timeAgo, type ProfileScreenData } from "@/lib/lists";
import { useFocusQuery } from "@/lib/use-focus-query";

export default function ProfileScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { data, loading, error, refetch } = useFocusQuery<ProfileScreenData | null>(() =>
    session ? getProfileScreen(session.user.id) : Promise.resolve(null),
  );

  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onPickAvatar = async () => {
    if (!session || uploading) return;
    setUploadError(null);
    setUploading(true);
    try {
      const url = await pickAndUploadAvatar(session.user.id);
      if (url) setLocalAvatar(url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Could not update photo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen>
      {loading ? (
        <ActivityIndicator color={Star.ink} style={styles.loader} />
      ) : error || !data ? (
        <ErrorState message={error ?? "Could not load your profile."} onRetry={refetch} />
      ) : (
        <>
          {/* Identity + stats in one card */}
          <Card style={styles.headerCard}>
            <View style={styles.topRow}>
              <Pressable onPress={onPickAvatar} disabled={uploading} style={styles.avatarWrap}>
                <Avatar url={localAvatar ?? data.profile.avatar_url} initials={initialsFrom(data.profile.display_name, data.profile.username)} size={72} />
                <View style={styles.cameraBadge}>
                  {uploading ? (
                    <ActivityIndicator size="small" color={Star.surface} />
                  ) : (
                    <Ionicons name="camera" size={14} color={Star.surface} />
                  )}
                </View>
              </Pressable>
              <View style={styles.headerInfo}>
                <Text style={styles.name}>{data.profile.display_name ?? "You"}</Text>
                {data.profile.username ? <Text style={styles.handle}>@{data.profile.username}</Text> : null}
              </View>
              <Pressable
                onPress={() => router.push("/settings")}
                style={({ pressed }) => [styles.settingsBtn, pressed && styles.settingsBtnPressed]}
                hitSlop={8}
                accessibilityLabel="Settings"
              >
                <Ionicons name="settings-outline" size={20} color={Star.ink} />
              </Pressable>
            </View>

            {data.profile.bio ? <Text style={styles.bio}>{data.profile.bio}</Text> : null}
            {data.profile.city ? <Pill icon="location" label={data.profile.city} /> : null}
            {uploadError ? <Text style={styles.errorText}>{uploadError}</Text> : null}

            <View style={styles.divider} />

            <View style={styles.statsRow}>
              {[
                { label: "Lists", value: data.lists.length },
                { label: "Followers", value: data.followers },
                { label: "Following", value: data.following },
              ].map((stat, i) => (
                <View key={stat.label} style={[styles.statCol, i > 0 && styles.statColDivider]}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Lists */}
          <Text style={styles.sectionTitle}>Your lists</Text>
          {data.lists.length === 0 ? (
            <Card style={styles.empty}>
              <Text style={styles.emptyTitle}>No lists yet</Text>
              <Text style={styles.emptyBody}>Tap Add to map out your first list of places.</Text>
            </Card>
          ) : (
            data.lists.map((list) => (
              <Card
                key={list.id}
                cover={<ListCover url={list.coverImageUrl} seed={list.id} />}
                onPress={() => router.push({ pathname: "/list/[id]", params: { id: list.id } })}
              >
                <View style={styles.listTitleRow}>
                  <Text style={[styles.listTitle, styles.flex]}>{list.title}</Text>
                  {!list.isPublic ? (
                    <View style={styles.privateBadge}>
                      <Ionicons name="lock-closed" size={11} color={Star.surface} />
                      <Text style={styles.privateBadgeText}>Private</Text>
                    </View>
                  ) : null}
                </View>
                {list.city || list.location ? <Pill icon="location" label={list.city ?? list.location!} /> : null}
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>
                    <Text style={styles.metaStrong}>{list.placesCount}</Text> places
                  </Text>
                  <Text style={styles.meta}>Updated {timeAgo(list.createdAt)}</Text>
                </View>
              </Card>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const makeStyles = (Star: Palette) => StyleSheet.create({
  loader: { marginTop: 40 },
  errorText: { fontSize: 13, fontWeight: "600", color: Star.danger },
  headerCard: { padding: 18, gap: 12 },
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
  headerInfo: { flex: 1, gap: 2 },
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
  name: { fontSize: 22, fontWeight: "900", color: Star.ink, letterSpacing: -0.5 },
  handle: { fontSize: 14, fontWeight: "700", color: Star.pop },
  bio: { fontSize: 14, fontWeight: "500", color: Star.textMuted },
  divider: { height: 1.5, backgroundColor: "rgba(20,18,16,0.1)", marginTop: 2 },
  statsRow: { flexDirection: "row" },
  statCol: { flex: 1, alignItems: "center", gap: 1 },
  statColDivider: { borderLeftWidth: 1.5, borderLeftColor: "rgba(20,18,16,0.1)" },
  statValue: { fontSize: 22, fontWeight: "900", color: Star.ink },
  statLabel: { fontSize: 12, fontWeight: "700", color: Star.textMuted },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: Star.ink, letterSpacing: -0.4, marginTop: 4 },
  flex: { flex: 1 },
  listTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  listTitle: { fontSize: 18, fontWeight: "800", color: Star.ink, letterSpacing: -0.3 },
  privateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Star.ink,
  },
  privateBadgeText: { fontSize: 11, fontWeight: "800", color: Star.surface },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  meta: { fontSize: 13, fontWeight: "600", color: Star.textMuted },
  metaStrong: { color: Star.ink, fontWeight: "800" },
  empty: { alignItems: "center", gap: 6, paddingVertical: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: Star.ink },
  emptyBody: { fontSize: 14, fontWeight: "500", color: Star.textMuted, textAlign: "center" },
});
