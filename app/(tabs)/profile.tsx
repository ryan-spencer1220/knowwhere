import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { initialsFrom } from "@/components/avatar";
import { ListCover } from "@/components/list-cover";
import { ProfileHeader } from "@/components/profile-header";
import { Card, ErrorState, Pill, Texture } from "@/components/ui/kit";
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
  const insets = useSafeAreaInsets();
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

  // Header (identity + stats) plus the "Your lists" section title. Rendered only
  // once profile data is loaded; the full-bleed white panel handles its own top
  // safe-area inset so it paints under the status bar.
  const header = data ? (
    <>
      <ProfileHeader
        avatarUrl={localAvatar ?? data.profile.avatar_url}
        initials={initialsFrom(data.profile.display_name, data.profile.username)}
        displayName={data.profile.display_name}
        username={data.profile.username}
        bio={data.profile.bio}
        city={data.profile.city}
        stats={[
          { key: "lists", label: "Lists", value: data.lists.length },
          { key: "followers", label: "Followers", value: data.followers },
          { key: "following", label: "Following", value: data.following },
        ]}
        uploading={uploading}
        uploadError={uploadError}
        onPickAvatar={onPickAvatar}
        onSettings={() => router.push("/settings")}
        onStatPress={(key) =>
          session
            ? router.push({
                pathname: "/connections/[id]",
                params: { id: session.user.id, tab: key, name: data.profile.display_name ?? "You" },
              })
            : undefined
        }
      />
      <Text style={styles.sectionTitle}>Your lists</Text>
    </>
  ) : null;

  // Loading/error have no header, so center them below the status bar; the
  // no-lists card sits inline under the section title.
  const empty = loading ? (
    <View style={[styles.centered, { paddingTop: insets.top + 100 }]}>
      <ActivityIndicator color={Star.ink} />
    </View>
  ) : error || !data ? (
    <View style={[styles.centered, { paddingTop: insets.top + 100 }]}>
      <ErrorState message={error ?? "Could not load your profile."} onRetry={refetch} />
    </View>
  ) : (
    <View style={styles.rowPad}>
      <Card style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>No lists yet</Text>
        <Text style={styles.emptyBody}>Tap Add to map out your first list of places.</Text>
      </Card>
    </View>
  );

  return (
    <View style={styles.root}>
      <Texture />
      <FlatList
        data={data?.lists ?? []}
        keyExtractor={(list) => list.id}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 36 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: list }) => (
          <View style={styles.rowPad}>
            <Card
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
          </View>
        )}
      />
    </View>
  );
}

const makeStyles = (Star: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: Star.base },
    listContent: { flexGrow: 1 },
    rowPad: { paddingHorizontal: 20 },
    sep: { height: 16 },
    centered: { paddingHorizontal: 20, alignItems: "center" },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "900",
      color: Star.ink,
      letterSpacing: -0.4,
      paddingHorizontal: 20,
      marginTop: 18,
      marginBottom: 16,
    },
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
    emptyCard: { alignItems: "center", gap: 6, paddingVertical: 24 },
    emptyTitle: { fontSize: 18, fontWeight: "900", color: Star.ink },
    emptyBody: { fontSize: 14, fontWeight: "500", color: Star.textMuted, textAlign: "center" },
  });
