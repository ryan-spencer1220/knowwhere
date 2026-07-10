import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { initialsFrom } from "@/components/avatar";
import { FollowButton } from "@/components/follow-button";
import { ListCover } from "@/components/list-cover";
import { ProfileHeader } from "@/components/profile-header";
import { Card, ErrorState, Pill, Texture } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/lists";
import { blockUser, isBlocked, REPORT_REASONS, reportContent, unblockUser } from "@/lib/moderation";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";
import { getUserProfile, type UserProfileData } from "@/lib/users";
import { useFocusQuery } from "@/lib/use-focus-query";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { data, loading, error, refetch } = useFocusQuery<UserProfileData | null>(() =>
    id ? getUserProfile(id, session?.user.id ?? null) : Promise.resolve(null),
  );

  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    if (id && data && !data.isSelf) isBlocked(id).then(setBlocked);
  }, [id, data]);

  const submitReport = (reason: string) => {
    if (!id) return;
    reportContent({ targetType: "user", targetId: id, reason }).catch(() => {});
    Alert.alert("Thanks for reporting", "Our team will review this account.");
  };

  const promptReport = () => {
    Alert.alert("Report this user", "Why are you reporting them?", [
      ...REPORT_REASONS.map((reason) => ({ text: reason, onPress: () => submitReport(reason) })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  const toggleBlock = async () => {
    if (!id) return;
    if (blocked) {
      try {
        await unblockUser(id);
        setBlocked(false);
      } catch {
        Alert.alert("Couldn't unblock", "Please try again.");
      }
      return;
    }
    Alert.alert("Block this user?", "You won't see their lists or profile in your feed and Explore.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block",
        style: "destructive",
        onPress: async () => {
          try {
            await blockUser(id);
            setBlocked(true);
            router.back();
          } catch {
            Alert.alert("Couldn't block", "Please try again.");
          }
        },
      },
    ]);
  };

  const openMenu = () => {
    Alert.alert(data?.profile.display_name ?? "User", undefined, [
      { text: "Report user", onPress: promptReport },
      { text: blocked ? "Unblock user" : "Block user", style: blocked ? ("default" as const) : ("destructive" as const), onPress: toggleBlock },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <View style={styles.root}>
      <Texture />
      <SafeAreaView edges={["top"]} style={styles.topBar}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]} hitSlop={8} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={24} color={Star.ink} />
          </Pressable>
          <View style={styles.headerSpacer} />
          {data && !data.isSelf ? (
            <Pressable onPress={openMenu} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]} hitSlop={8} accessibilityLabel="More options">
              <Ionicons name="ellipsis-horizontal" size={22} color={Star.ink} />
            </Pressable>
          ) : (
            <View style={styles.backBtn} />
          )}
        </View>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator color={Star.ink} style={styles.loader} />
      ) : error || !data ? (
        <View style={styles.centerPad}>
          <ErrorState message={error ?? "Could not load this profile."} onRetry={refetch} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ProfileHeader
            avatarUrl={data.profile.avatar_url}
            initials={initialsFrom(data.profile.display_name, data.profile.username)}
            displayName={data.profile.display_name}
            username={data.profile.username}
            bio={data.profile.bio}
            city={data.profile.city}
            nameFallback="KnowWhere user"
            stackMeta
            topInset={0}
            stats={[
              { key: "lists", label: "Lists", value: data.lists.length },
              { key: "followers", label: "Followers", value: data.followers },
              { key: "following", label: "Following", value: data.following },
            ]}
            action={!data.isSelf ? <FollowButton targetId={data.profile.id} following={data.isFollowing} /> : undefined}
            onStatPress={(key) =>
              router.push({
                pathname: "/connections/[id]",
                params: { id: data.profile.id, tab: key, name: data.profile.display_name ?? "Profile" },
              })
            }
          />

          <View style={styles.listsSection}>
            <Text style={styles.sectionTitle}>Lists</Text>
            {data.lists.length === 0 ? (
              <Card style={styles.empty}>
                <Text style={styles.emptyText}>No public lists yet.</Text>
              </Card>
            ) : (
              data.lists.map((list) => (
                <Card
                  key={list.id}
                  cover={<ListCover url={list.coverImageUrl} seed={list.id} />}
                  onPress={() => router.push({ pathname: "/list/[id]", params: { id: list.id } })}
                >
                  <Text style={styles.listTitle}>{list.title}</Text>
                  {list.city || list.location ? <Pill icon="location" label={list.city ?? list.location!} /> : null}
                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>
                      <Text style={styles.metaStrong}>{list.placesCount}</Text> places
                    </Text>
                    <Text style={styles.meta}>{timeAgo(list.createdAt)}</Text>
                  </View>
                </Card>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (Star: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: Star.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.6 },
  // Mint nav bar so it reads as one continuous colored block with the header.
  topBar: { backgroundColor: Star.base },
  headerSpacer: { flex: 1 },
  loader: { marginTop: 40 },
  centerPad: { padding: 20 },
  scroll: { paddingBottom: 36 },
  listsSection: { paddingHorizontal: 20, paddingTop: 18, gap: 16 },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: Star.ink, letterSpacing: -0.4 },
  empty: { alignItems: "center", paddingVertical: 20 },
  emptyText: { fontSize: 14, fontWeight: "500", color: Star.textMuted },
  listTitle: { fontSize: 18, fontWeight: "800", color: Star.ink, letterSpacing: -0.3 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  meta: { fontSize: 13, fontWeight: "600", color: Star.textMuted },
  metaStrong: { color: Star.ink, fontWeight: "800" },
});
