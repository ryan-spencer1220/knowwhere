import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth";
import { FLOATING_TAB_BAR_SPACE } from "@/lib/layout";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";
import { getNearbyPlaces, milesLabel, type NearbyPlace } from "@/lib/nearby";

export type Coords = { latitude: number; longitude: number };

// A person whose places appear nearby — used to build the filter row.
export type OwnerOption = { id: string; label: string };

// Map default until geolocation resolves (also used as the web center).
export const DEFAULT_CENTER: Coords = { latitude: 37.773, longitude: -122.431 };

export function useNearbyPlaces(center: Coords | null) {
  const { session } = useAuth();
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);
  // Filter the list/map down to a single person's places (null = everyone).
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!center || !session) {
      setPlaces([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getNearbyPlaces(session.user.id, center.latitude, center.longitude)
      .then((p) => {
        if (active) {
          setPlaces(p);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setPlaces([]);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [center?.latitude, center?.longitude, session]);

  // Distinct owners present in the current results, "You" first then by name.
  const owners = useMemo<OwnerOption[]>(() => {
    const seen = new Map<string, OwnerOption>();
    for (const p of places) {
      if (!p.ownerId || seen.has(p.ownerId)) continue;
      const isSelf = p.ownerId === session?.user.id;
      const label = isSelf ? "You" : p.ownerName ?? (p.ownerUsername ? `@${p.ownerUsername}` : "Someone");
      seen.set(p.ownerId, { id: p.ownerId, label });
    }
    return [...seen.values()].sort((a, b) => {
      if (a.label === "You") return -1;
      if (b.label === "You") return 1;
      return a.label.localeCompare(b.label);
    });
  }, [places, session]);

  // Drop a stale selection if that person is no longer in view (e.g. map moved).
  useEffect(() => {
    if (ownerFilter && !owners.some((o) => o.id === ownerFilter)) setOwnerFilter(null);
  }, [owners, ownerFilter]);

  const filtered = useMemo(
    () => (ownerFilter ? places.filter((p) => p.ownerId === ownerFilter) : places),
    [places, ownerFilter],
  );

  return { places: filtered, loading, owners, ownerFilter, setOwnerFilter };
}

// Show a search box inside the picker once the people list gets long enough to
// scroll uncomfortably (e.g. someone who follows many active mappers).
const SEARCH_THRESHOLD = 8;

// Dropdown to filter nearby places by person. A compact trigger opens a modal
// picker (searchable when long) so it scales to hundreds of followed people.
// Renders nothing until there are at least two people to choose between.
export function PersonFilter({
  owners,
  ownerFilter,
  onSelect,
}: {
  owners: OwnerOption[];
  ownerFilter: string | null;
  onSelect: (id: string | null) => void;
}) {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const showSearch = owners.length > SEARCH_THRESHOLD;
  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? owners.filter((o) => o.label.toLowerCase().includes(q)) : owners),
    [owners, q],
  );

  if (owners.length < 2) return null;

  const currentLabel = ownerFilter ? owners.find((o) => o.id === ownerFilter)?.label ?? "Everyone" : "Everyone";
  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const choose = (id: string | null) => {
    onSelect(id);
    close();
  };

  return (
    <View style={styles.filterRow}>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Filter by person. Currently showing ${currentLabel}.`}
      >
        <Ionicons name="filter" size={14} color={Star.ink} />
        <Text style={styles.triggerText} numberOfLines={1}>
          {currentLabel}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Star.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Show places from</Text>
              <Pressable onPress={close} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={Star.ink} />
              </Pressable>
            </View>

            {showSearch ? (
              <View style={styles.searchRow}>
                <Ionicons name="search" size={16} color={Star.textMuted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search people"
                  placeholderTextColor={Star.textMuted}
                  style={styles.searchInput}
                  autoCorrect={false}
                  autoFocus
                />
              </View>
            ) : null}

            <ScrollView style={styles.optionScroll} keyboardShouldPersistTaps="handled">
              {!q ? <OptionRow label="Everyone" active={ownerFilter === null} onPress={() => choose(null)} /> : null}
              {matches.map((o) => (
                <OptionRow key={o.id} label={o.label} active={ownerFilter === o.id} onPress={() => choose(o.id)} />
              ))}
              {q && matches.length === 0 ? <Text style={styles.noMatch}>No one matches “{query.trim()}”.</Text> : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function OptionRow({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {label === "You" ? <Ionicons name="person" size={14} color={Star.ink} /> : null}
      <Text style={[styles.optionText, active && styles.optionTextActive]} numberOfLines={1}>
        {label}
      </Text>
      {active ? <Ionicons name="checkmark" size={18} color={Star.pop} style={styles.optionCheck} /> : null}
    </Pressable>
  );
}

export function NearMeHeader() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Near me</Text>
      <Text style={styles.subtitle}>Saved spots from you and the people you follow</Text>
    </View>
  );
}

export function NearbyList({
  places,
  loading,
  onPressPlace,
}: {
  places: NearbyPlace[];
  loading: boolean;
  onPressPlace: (id: string) => void;
}) {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + FLOATING_TAB_BAR_SPACE }]}
      showsVerticalScrollIndicator={false}
    >
      {loading ? (
        <ActivityIndicator color={Star.ink} style={styles.loader} />
      ) : places.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing nearby</Text>
          <Text style={styles.emptyBody}>No saved places around here yet. Add some, or follow people who have.</Text>
        </Card>
      ) : (
        places.map((p) => (
          <Card key={p.id} onPress={() => onPressPlace(p.id)}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.sub}>
                  in <Text style={styles.subStrong}>{p.listTitle ?? "a list"}</Text>
                  {p.ownerUsername ? <Text> · @{p.ownerUsername}</Text> : null}
                </Text>
                {p.address ? (
                  <Text style={styles.address} numberOfLines={1}>
                    {p.address}
                  </Text>
                ) : null}
              </View>
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>{milesLabel(p.distanceKm)}</Text>
              </View>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const makeStyles = (Star: Palette) => StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 32, fontWeight: "900", color: Star.ink, letterSpacing: -1 },
  subtitle: { fontSize: 14, fontWeight: "600", color: Star.ink, opacity: 0.65, marginTop: 2 },
  pressed: { opacity: 0.7 },
  filterRow: { paddingHorizontal: 20, paddingBottom: 12 },
  trigger: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Star.ink,
    backgroundColor: Star.surface,
  },
  triggerText: { flexShrink: 1, fontSize: 13, fontWeight: "800", color: Star.ink },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20,18,16,0.45)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: Star.surface,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: Star.ink,
    padding: 16,
    gap: 12,
    maxHeight: "70%",
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontSize: 17, fontWeight: "900", color: Star.ink, letterSpacing: -0.3 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Star.base,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Star.ink,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: "600", color: Star.text, padding: 0 },
  optionScroll: { flexGrow: 0 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
  optionText: { flex: 1, fontSize: 15, fontWeight: "700", color: Star.ink },
  optionTextActive: { color: Star.pop, fontWeight: "800" },
  optionCheck: { marginLeft: "auto" },
  noMatch: { fontSize: 14, fontWeight: "500", color: Star.textMuted, paddingVertical: 12 },
  listContent: { padding: 16, gap: 12 },
  loader: { marginTop: 30 },
  empty: { alignItems: "center", gap: 6, paddingVertical: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: Star.ink },
  emptyBody: { fontSize: 14, fontWeight: "500", color: Star.textMuted, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontSize: 16, fontWeight: "800", color: Star.ink },
  sub: { fontSize: 13, fontWeight: "600", color: Star.textMuted, marginTop: 1 },
  subStrong: { color: Star.ink, fontWeight: "800" },
  address: { fontSize: 13, fontWeight: "500", color: Star.textMuted, marginTop: 1 },
  distanceBadge: {
    backgroundColor: Star.pop,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Star.ink,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  distanceText: { fontSize: 12, fontWeight: "800", color: Star.surface },
});
