import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar, initialsFrom } from "@/components/avatar";
import { FollowButton } from "@/components/follow-button";
import { ListCover } from "@/components/list-cover";
import { Card, ErrorState, Heading, ListScreen, Pill } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth";
import { getTrendingLists, type ListCard } from "@/lib/lists";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";
import { useFocusQuery } from "@/lib/use-focus-query";
import { getExploreUsers, type ExploreUser } from "@/lib/users";

type Tab = "lists" | "people";

export default function ExploreScreen() {
  const { session } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const [tab, setTab] = useState<Tab>("lists");

  const lists = useFocusQuery<ListCard[]>(() => getTrendingLists(session?.user.id ?? null));
  const people = useFocusQuery<ExploreUser[]>(() => getExploreUsers(session?.user.id ?? null));

  const header = (
    <>
      <Heading
        title="Explore"
        subtitle={tab === "lists" ? "Lists getting the most love right now" : "Find people to follow"}
      />

      {/* Lists / People toggle */}
      <View style={styles.segment}>
        {(
          [
            { value: "lists", label: "Lists", icon: "albums-outline" },
            { value: "people", label: "People", icon: "people-outline" },
          ] as const
        ).map((opt) => {
          const active = tab === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setTab(opt.value)}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  return tab === "lists" ? <ListsTab query={lists} header={header} /> : <PeopleTab query={people} header={header} />;
}

function ListsTab({ query, header }: { query: ReturnType<typeof useFocusQuery<ListCard[]>>; header: ReactNode }) {
  const router = useRouter();
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { data, loading, error, refetch } = query;
  const items = !loading && !error && data ? data : [];

  return (
    <ListScreen
      data={items}
      keyExtractor={(item) => item.id}
      header={header}
      empty={
        loading ? (
          <ActivityIndicator color={Star.ink} style={styles.loader} />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <Card style={styles.empty}>
            <Text style={styles.emptyTitle}>No public lists yet</Text>
            <Text style={styles.emptyBody}>Be the first — create a list and share your favorite spots.</Text>
          </Card>
        )
      }
      renderItem={(item) => (
        <Card
          style={styles.listCard}
          cover={<ListCover url={item.coverImageUrl} seed={item.id} height={116} />}
          onPress={() => router.push({ pathname: "/list/[id]", params: { id: item.id } })}
        >
          <View style={styles.topRow}>
            {item.savesCount > 0 ? <Pill icon="flame" label="Trending" tone="accent" /> : <Pill icon="sparkles" label="Fresh" />}
            <Text style={styles.saves}>★ {item.savesCount.toLocaleString()}</Text>
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={styles.metaRow}>
            {item.city || item.location ? <Pill icon="location" label={item.city ?? item.location!} /> : <View />}
            <Text style={styles.meta}>
              <Text style={styles.metaStrong}>{item.placesCount}</Text> places
            </Text>
          </View>
        </Card>
      )}
    />
  );
}

function PeopleTab({ query, header }: { query: ReturnType<typeof useFocusQuery<ExploreUser[]>>; header: ReactNode }) {
  const router = useRouter();
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { data, loading, error, refetch } = query;
  const items = !loading && !error && data ? data : [];

  return (
    <ListScreen
      data={items}
      keyExtractor={(u) => u.id}
      header={header}
      empty={
        loading ? (
          <ActivityIndicator color={Star.ink} style={styles.loader} />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <Card style={styles.empty}>
            <Text style={styles.emptyTitle}>No one to show yet</Text>
            <Text style={styles.emptyBody}>As people join KnowWhere, they&apos;ll show up here.</Text>
          </Card>
        )
      }
      renderItem={(u) => (
        <Card>
          <View style={styles.userRow}>
            <Pressable style={styles.userInfo} onPress={() => router.push({ pathname: "/user/[id]", params: { id: u.id } })}>
              <Avatar url={u.avatarUrl} initials={initialsFrom(u.displayName, u.username)} size={52} />
              <View style={styles.flex}>
                <Text style={styles.userName} numberOfLines={1}>
                  {u.displayName ?? "KnowWhere user"}
                </Text>
                {u.username ? <Text style={styles.userHandle}>@{u.username}</Text> : null}
                {u.city ? <Text style={styles.userCity}>{u.city}</Text> : null}
              </View>
            </Pressable>
            <FollowButton targetId={u.id} following={u.isFollowing} />
          </View>
        </Card>
      )}
    />
  );
}

const makeStyles = (Star: Palette) => StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 40 },
  empty: { alignItems: "center", gap: 6, paddingVertical: 28 },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: Star.ink },
  emptyBody: { fontSize: 14, fontWeight: "500", color: Star.textMuted, textAlign: "center" },
  segment: {
    flexDirection: "row",
    backgroundColor: Star.surface,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: Star.ink,
    padding: 4,
    gap: 4,
  },
  segmentItem: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 9 },
  segmentItemActive: { backgroundColor: Star.ink },
  segmentText: { fontSize: 15, fontWeight: "800", color: Star.ink },
  segmentTextActive: { color: Star.pop },
  listCard: { gap: 5, paddingBottom: 13 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  saves: { fontSize: 14, fontWeight: "800", color: Star.ink },
  cardTitle: { fontSize: 19, fontWeight: "800", color: Star.ink, letterSpacing: -0.4 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 1 },
  meta: { fontSize: 13, fontWeight: "600", color: Star.textMuted },
  metaStrong: { color: Star.ink, fontWeight: "800" },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  userInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  userName: { fontSize: 16, fontWeight: "800", color: Star.ink },
  userHandle: { fontSize: 13, fontWeight: "700", color: Star.pop },
  userCity: { fontSize: 13, fontWeight: "500", color: Star.textMuted, marginTop: 1 },
});
