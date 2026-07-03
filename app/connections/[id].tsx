import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar, initialsFrom } from "@/components/avatar";
import { FollowButton } from "@/components/follow-button";
import { ListCover } from "@/components/list-cover";
import { Card, ErrorState, Pill, Texture } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth";
import { getMyLists, type ListCard } from "@/lib/lists";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";
import { getFollowers, getFollowing, type ExploreUser } from "@/lib/users";
import { useFocusQuery } from "@/lib/use-focus-query";

type Tab = "lists" | "followers" | "following";
const TABS: { key: Tab; label: string }[] = [
  { key: "lists", label: "Lists" },
  { key: "followers", label: "Followers" },
  { key: "following", label: "Following" },
];

type Connections = { lists: ListCard[]; followers: ExploreUser[]; following: ExploreUser[] };

async function loadConnections(userId: string, currentUserId: string | null): Promise<Connections> {
  const [lists, followers, following] = await Promise.all([
    getMyLists(userId),
    getFollowers(userId, currentUserId),
    getFollowing(userId, currentUserId),
  ]);
  return { lists, followers, following };
}

export default function ConnectionsScreen() {
  const { id, tab, name } = useLocalSearchParams<{ id: string; tab?: Tab; name?: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [active, setActive] = useState<Tab>(tab && TABS.some((t) => t.key === tab) ? tab : "followers");

  const { data, loading, error, refetch } = useFocusQuery<Connections | null>(() =>
    id ? loadConnections(id, session?.user.id ?? null) : Promise.resolve(null),
  );

  const people = active === "followers" ? data?.followers ?? [] : data?.following ?? [];
  const lists = data?.lists ?? [];

  return (
    <View style={styles.root}>
      <Texture />
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]} hitSlop={8} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={24} color={Star.ink} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {name || "Profile"}
          </Text>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.segment}>
          {TABS.map((t) => {
            const on = active === t.key;
            return (
              <Pressable key={t.key} onPress={() => setActive(t.key)} style={[styles.segmentItem, on && styles.segmentItemActive]}>
                <Text style={[styles.segmentText, on && styles.segmentTextActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator color={Star.ink} style={styles.loader} />
      ) : error || !data ? (
        <View style={styles.centerPad}>
          <ErrorState message={error ?? "Couldn't load this."} onRetry={refetch} />
        </View>
      ) : active === "lists" ? (
        <FlatList
          data={lists}
          keyExtractor={(l) => l.id}
          contentContainerStyle={styles.content}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyLabel text="No lists yet." />}
          renderItem={({ item }) => (
            <Card
              cover={<ListCover url={item.coverImageUrl} seed={item.id} />}
              onPress={() => router.push({ pathname: "/list/[id]", params: { id: item.id } })}
            >
              <Text style={styles.listTitle}>{item.title}</Text>
              {item.city || item.location ? <Pill icon="location" label={item.city ?? item.location!} /> : null}
              <Text style={styles.meta}>
                <Text style={styles.metaStrong}>{item.placesCount}</Text> places
              </Text>
            </Card>
          )}
        />
      ) : (
        <FlatList
          data={people}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.content}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyLabel text={active === "followers" ? "No followers yet." : "Not following anyone yet."} />}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.userRow}>
                <Pressable style={styles.userInfo} onPress={() => router.push({ pathname: "/user/[id]", params: { id: item.id } })}>
                  <Avatar url={item.avatarUrl} initials={initialsFrom(item.displayName, item.username)} size={48} />
                  <View style={styles.flex}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {item.displayName ?? "KnowWhere user"}
                    </Text>
                    {item.username ? <Text style={styles.userHandle}>@{item.username}</Text> : null}
                  </View>
                </Pressable>
                {session && item.id !== session.user.id ? <FollowButton targetId={item.id} following={item.isFollowing} /> : null}
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

function EmptyLabel({ text }: { text: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Card style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </Card>
  );
}

const makeStyles = (Star: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: Star.base },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    pressed: { opacity: 0.6 },
    headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "900", color: Star.ink, letterSpacing: -0.3 },
    segment: {
      flexDirection: "row",
      marginHorizontal: 20,
      marginBottom: 8,
      backgroundColor: Star.surface,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: Star.ink,
      padding: 4,
      gap: 4,
    },
    segmentItem: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 9 },
    segmentItemActive: { backgroundColor: Star.ink },
    segmentText: { fontSize: 14, fontWeight: "800", color: Star.ink },
    segmentTextActive: { color: Star.pop },
    loader: { marginTop: 40 },
    centerPad: { padding: 20 },
    content: { padding: 20, paddingBottom: 36, flexGrow: 1 },
    sep: { height: 12 },
    listTitle: { fontSize: 18, fontWeight: "800", color: Star.ink, letterSpacing: -0.3 },
    meta: { fontSize: 13, fontWeight: "600", color: Star.textMuted },
    metaStrong: { color: Star.ink, fontWeight: "800" },
    userRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    userInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
    flex: { flex: 1 },
    userName: { fontSize: 16, fontWeight: "800", color: Star.ink },
    userHandle: { fontSize: 13, fontWeight: "700", color: Star.pop },
    empty: { alignItems: "center", paddingVertical: 24 },
    emptyText: { fontSize: 14, fontWeight: "500", color: Star.textMuted },
  });
