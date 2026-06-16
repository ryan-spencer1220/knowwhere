import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { FollowButton } from "@/components/follow-button";
import { ListCover } from "@/components/list-cover";
import { Card, Heading, Pill, Screen } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";
import { getFeedLists, timeAgo, type ListCard } from "@/lib/lists";
import { useFocusQuery } from "@/lib/use-focus-query";
import { getSuggestedUsers, type UserCard } from "@/lib/users";

function userInitials(name: string | null, username: string | null): string {
  const base = (name || username || "").trim();
  if (!base) return "?";
  const parts = base.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export default function FeedScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const feed = useFocusQuery<ListCard[]>(() => (session ? getFeedLists(session.user.id) : Promise.resolve([])));
  const suggestions = useFocusQuery<UserCard[]>(() => (session ? getSuggestedUsers(session.user.id) : Promise.resolve([])));

  const isEmpty = !feed.loading && !feed.error && (!feed.data || feed.data.length === 0);

  return (
    <Screen>
      <Heading title="Feed" subtitle="Fresh lists from people you follow" />

      {feed.loading ? (
        <ActivityIndicator color={Star.ink} style={styles.loader} />
      ) : feed.error ? (
        <Card>
          <Text style={styles.errorText}>{feed.error}</Text>
        </Card>
      ) : !isEmpty ? (
        feed.data!.map((item) => (
          <Card
            key={item.id}
            style={styles.listCard}
            cover={<ListCover url={item.coverImageUrl} seed={item.id} height={116} />}
            onPress={() => router.push({ pathname: "/list/[id]", params: { id: item.id } })}
          >
            <Text style={styles.byline}>
              <Text style={styles.bylineName}>@{item.ownerUsername ?? "someone"}</Text> made a new list
            </Text>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={styles.metaRow}>
              {item.city || item.location ? <Pill icon="location" label={item.city ?? item.location!} /> : <View />}
              <Text style={styles.meta}>
                <Text style={styles.metaStrong}>{item.placesCount}</Text> places · {timeAgo(item.createdAt)}
              </Text>
            </View>
          </Card>
        ))
      ) : (
        <Card style={styles.empty}>
          <Text style={styles.emptyTitle}>Your feed is empty</Text>
          <Text style={styles.emptyBody}>Follow people below and their newest lists will show up here.</Text>
        </Card>
      )}

      {/* Discover people to follow */}
      {isEmpty ? (
        <>
          <Text style={styles.sectionTitle}>People to follow</Text>
          {suggestions.loading ? (
            <ActivityIndicator color={Star.ink} style={styles.loader} />
          ) : !suggestions.data || suggestions.data.length === 0 ? (
            <Card style={styles.empty}>
              <Text style={styles.emptyBody}>No one to suggest yet — invite some friends!</Text>
            </Card>
          ) : (
            suggestions.data.map((u) => (
              <Card key={u.id}>
                <View style={styles.suggestRow}>
                  <Pressable style={styles.suggestInfo} onPress={() => router.push({ pathname: "/user/[id]", params: { id: u.id } })}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarInitials}>{userInitials(u.displayName, u.username)}</Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.suggestName}>{u.displayName ?? "KnowWhere user"}</Text>
                      {u.username ? <Text style={styles.suggestHandle}>@{u.username}</Text> : null}
                    </View>
                  </Pressable>
                  <FollowButton targetId={u.id} following={false} />
                </View>
              </Card>
            ))
          )}
        </>
      ) : null}
    </Screen>
  );
}

const makeStyles = (Star: Palette) => StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 24 },
  errorText: { fontSize: 14, fontWeight: "600", color: Star.danger },
  empty: { alignItems: "center", gap: 6, paddingVertical: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: Star.ink },
  emptyBody: { fontSize: 14, fontWeight: "500", color: Star.textMuted, textAlign: "center" },
  listCard: { gap: 5, paddingBottom: 13 },
  byline: { fontSize: 13, fontWeight: "600", color: Star.textMuted },
  bylineName: { color: Star.pop, fontWeight: "800" },
  cardTitle: { fontSize: 19, fontWeight: "800", color: Star.ink, letterSpacing: -0.4 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 1 },
  meta: { fontSize: 13, fontWeight: "600", color: Star.textMuted },
  metaStrong: { color: Star.ink, fontWeight: "800" },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: Star.ink, letterSpacing: -0.4, marginTop: 4 },
  suggestRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  suggestInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Star.pop,
    borderWidth: 2,
    borderColor: Star.ink,
  },
  avatarInitials: { fontSize: 18, fontWeight: "900", color: Star.surface },
  suggestName: { fontSize: 16, fontWeight: "800", color: Star.ink },
  suggestHandle: { fontSize: 13, fontWeight: "700", color: Star.pop },
});
