import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AddPlaceToList } from "@/components/add-place-to-list";
import { LikeButton } from "@/components/like-button";
import { ListMap } from "@/components/list-map";
import { Card, ErrorState, IconButton, Pill, Texture } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth";
import { deleteList, getListDetail, removePlaceFromList, renameList, setListVisibility, timeAgo, type ListDetail, type PlaceItem } from "@/lib/lists";
import { REPORT_REASONS, reportContent } from "@/lib/moderation";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";
import { useFocusQuery } from "@/lib/use-focus-query";

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { data, loading, error, refetch } = useFocusQuery<ListDetail | null>(() =>
    id ? getListDetail(id, session?.user.id ?? null) : Promise.resolve(null),
  );

  const isOwner = !!data && !!session && data.ownerId === session.user.id;
  const [isPublic, setIsPublic] = useState(true);
  const [togglingVis, setTogglingVis] = useState(false);
  useEffect(() => {
    if (data) setIsPublic(data.isPublic);
  }, [data]);

  const [deleting, setDeleting] = useState(false);

  // Inline title editing (owner only).
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  const startRename = () => {
    if (!data) return;
    setTitleDraft(data.title);
    setEditingTitle(true);
  };
  const saveRename = async () => {
    const next = titleDraft.trim();
    if (!data || !next || next === data.title) {
      setEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    try {
      await renameList(data.id, next);
      setEditingTitle(false);
      refetch();
    } catch {
      Alert.alert("Couldn't rename", "Something went wrong renaming this list. Please try again.");
    } finally {
      setSavingTitle(false);
    }
  };

  const promptReport = () => {
    if (!id) return;
    Alert.alert("Report this list", "Why are you reporting it?", [
      ...REPORT_REASONS.map((reason) => ({
        text: reason,
        onPress: () => {
          reportContent({ targetType: "list", targetId: id, reason }).catch(() => {});
          Alert.alert("Thanks for reporting", "Our team will review this list.");
        },
      })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  const confirmDelete = () => {
    if (!data || deleting) return;
    Alert.alert(
      "Delete list",
      `Delete "${data.title}"? This removes the list and all its places for everyone. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteList(data.id);
              router.back();
            } catch {
              setDeleting(false);
              Alert.alert("Couldn't delete", "Something went wrong deleting this list. Please try again.");
            }
          },
        },
      ],
    );
  };

  const confirmRemovePlace = (place: PlaceItem) => {
    Alert.alert("Remove place", `Remove "${place.name}" from this list?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removePlaceFromList(place.id);
            refetch();
          } catch {
            Alert.alert("Couldn't remove", "Something went wrong. Please try again.");
          }
        },
      },
    ]);
  };

  const toggleVisibility = async () => {
    if (!data || togglingVis) return;
    const next = !isPublic;
    setIsPublic(next);
    setTogglingVis(true);
    try {
      await setListVisibility(data.id, next);
    } catch {
      setIsPublic(!next);
    } finally {
      setTogglingVis(false);
    }
  };

  const mapPlaces =
    data?.places
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => ({ id: p.id, name: p.name, latitude: p.latitude as number, longitude: p.longitude as number })) ?? [];

  return (
    <View style={styles.root}>
      <Texture />
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <IconButton icon="chevron-back" onPress={() => router.back()} accessibilityLabel="Back" />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {data?.title ?? "List"}
          </Text>
          {isOwner ? (
            <IconButton icon="trash-outline" tone="danger" onPress={confirmDelete} loading={deleting} accessibilityLabel="Delete list" />
          ) : data ? (
            <IconButton icon="ellipsis-horizontal" onPress={promptReport} accessibilityLabel="Report list" />
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator color={Star.ink} style={styles.loader} />
      ) : error || !data ? (
        <View style={styles.centerPad}>
          <ErrorState message={error ?? "Could not load this list."} onRetry={refetch} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <ListMap places={mapPlaces} />

          <View style={styles.body}>
            {isOwner && editingTitle ? (
              <View style={styles.titleEditRow}>
                <TextInput
                  value={titleDraft}
                  onChangeText={setTitleDraft}
                  style={styles.titleInput}
                  placeholder="List name"
                  placeholderTextColor={Star.textMuted}
                  autoFocus
                  maxLength={80}
                  returnKeyType="done"
                  onSubmitEditing={saveRename}
                />
                <IconButton icon="checkmark" onPress={saveRename} loading={savingTitle} size={44} accessibilityLabel="Save list name" />
                <IconButton icon="close" onPress={() => setEditingTitle(false)} disabled={savingTitle} size={44} accessibilityLabel="Cancel renaming" />
              </View>
            ) : (
              <View style={styles.titleRow}>
                <Text style={styles.title}>{data.title}</Text>
                {isOwner ? (
                  <IconButton icon="pencil" onPress={startRename} size={38} accessibilityLabel={`Rename list ${data.title}`} />
                ) : null}
              </View>
            )}
            <View style={styles.metaRow}>
              <Pressable
                onPress={() => data.ownerId && router.push({ pathname: "/user/[id]", params: { id: data.ownerId } })}
                disabled={!data.ownerId}
                hitSlop={6}
              >
                <Text style={styles.byline}>
                  by <Text style={styles.bylineName}>@{data.ownerUsername ?? "someone"}</Text>
                </Text>
              </Pressable>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.byline}>{timeAgo(data.createdAt)}</Text>
            </View>
            {data.city || data.location ? <Pill icon="location" label={data.city ?? data.location!} /> : null}
            {data.description ? <Text style={styles.description}>{data.description}</Text> : null}

            <View style={styles.likeRow}>
              <LikeButton listId={data.id} liked={data.likedByMe} count={data.savesCount} />
              {isOwner ? (
                <Pressable
                  onPress={toggleVisibility}
                  disabled={togglingVis}
                  style={({ pressed }) => [styles.visToggle, !isPublic && styles.visTogglePrivate, pressed && styles.pressed]}
                  hitSlop={6}
                >
                  <Ionicons
                    name={isPublic ? "globe-outline" : "lock-closed"}
                    size={15}
                    color={isPublic ? Star.ink : Star.surface}
                  />
                  <Text style={[styles.visToggleText, !isPublic && styles.visToggleTextPrivate]}>
                    {isPublic ? "Public" : "Private"}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>
              {data.places.length} {data.places.length === 1 ? "place" : "places"}
            </Text>

            {data.places.length === 0 ? (
              <Card style={styles.empty}>
                <Text style={styles.emptyText}>This list doesn&apos;t have any places yet.</Text>
              </Card>
            ) : (
              data.places.map((place, i) => (
                <Card key={place.id} onPress={() => router.push({ pathname: "/place/[id]", params: { id: place.id } })}>
                  <View style={styles.placeRow}>
                    <View style={styles.numberBadge}>
                      <Text style={styles.numberText}>{i + 1}</Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.placeName}>{place.name}</Text>
                      {place.address ? <Text style={styles.placeAddress}>{place.address}</Text> : null}
                      {place.note ? <Text style={styles.placeNote}>{place.note}</Text> : null}
                    </View>
                    {isOwner ? (
                      <Pressable
                        onPress={() => confirmRemovePlace(place)}
                        hitSlop={8}
                        style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${place.name}`}
                      >
                        <Ionicons name="close" size={18} color={Star.textMuted} />
                      </Pressable>
                    ) : null}
                  </View>
                </Card>
              ))
            )}

            {isOwner ? (
              <AddPlaceToList
                listId={data.id}
                existingGoogleIds={data.places.map((p) => p.googlePlaceId).filter((x): x is string => !!x)}
                nextPosition={data.places.reduce((m, p) => Math.max(m, p.position), -1) + 1}
                onAdded={refetch}
              />
            ) : null}
          </View>
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
  centerPad: { padding: 20 },
  scroll: { paddingBottom: 36 },
  body: { padding: 20, gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { flex: 1, fontSize: 28, fontWeight: "900", color: Star.ink, letterSpacing: -0.7 },
  titleEditRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  titleInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "900",
    color: Star.ink,
    letterSpacing: -0.5,
    backgroundColor: Star.surface,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: Star.ink,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  byline: { fontSize: 14, fontWeight: "600", color: Star.textMuted },
  bylineName: { color: Star.pop, fontWeight: "800" },
  metaDot: { color: Star.textMuted, fontWeight: "800" },
  description: { fontSize: 15, fontWeight: "500", color: Star.text, lineHeight: 21 },
  likeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  visToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Star.ink,
    backgroundColor: Star.surface,
  },
  visTogglePrivate: { backgroundColor: Star.ink },
  visToggleText: { fontSize: 13, fontWeight: "800", color: Star.ink },
  visToggleTextPrivate: { color: Star.surface },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: Star.ink, letterSpacing: -0.4, marginTop: 4 },
  empty: { alignItems: "center", paddingVertical: 20 },
  emptyText: { fontSize: 14, fontWeight: "500", color: Star.textMuted },
  placeRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Star.base,
    borderWidth: 2,
    borderColor: Star.ink,
  },
  numberBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Star.pop,
    borderWidth: 2,
    borderColor: Star.ink,
  },
  numberText: { fontSize: 14, fontWeight: "900", color: Star.surface },
  placeName: { fontSize: 16, fontWeight: "800", color: Star.ink },
  placeAddress: { fontSize: 13, fontWeight: "500", color: Star.textMuted, marginTop: 1 },
  placeNote: { fontSize: 14, fontWeight: "500", color: Star.text, marginTop: 4 },
});
