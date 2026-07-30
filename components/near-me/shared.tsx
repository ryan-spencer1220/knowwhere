import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth";
import { FLOATING_TAB_BAR_SPACE } from "@/lib/layout";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";
import { getNearbyPlaces, getOwnerLists, milesLabel, type NearbyPlace, type OwnerList } from "@/lib/nearby";

export type Coords = { latitude: number; longitude: number };

// A person whose places appear nearby — used to build the filter row.
export type OwnerOption = { id: string; label: string };

// Map default until geolocation resolves (also used as the web center).
export const DEFAULT_CENTER: Coords = { latitude: 37.773, longitude: -122.431 };

export function useNearbyPlaces(center: Coords | null) {
  const { session } = useAuth();
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);
  // Filter the list/map down to a single person's places (null = everyone),
  // and optionally to one of that person's lists (null = all of their lists).
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<string | null>(null);
  const [ownerLists, setOwnerLists] = useState<OwnerList[]>([]);
  const [ownerListsLoading, setOwnerListsLoading] = useState(false);

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

  // When the selected person changes, reset the list filter and load all of
  // their lists (not just the ones with places nearby).
  useEffect(() => {
    setListFilter(null);
    if (!ownerFilter) {
      setOwnerLists([]);
      return;
    }
    let active = true;
    setOwnerListsLoading(true);
    getOwnerLists(ownerFilter)
      .then((ls) => active && setOwnerLists(ls))
      .catch(() => active && setOwnerLists([]))
      .finally(() => active && setOwnerListsLoading(false));
    return () => {
      active = false;
    };
  }, [ownerFilter]);

  const filtered = useMemo(() => {
    let result = ownerFilter ? places.filter((p) => p.ownerId === ownerFilter) : places;
    if (listFilter) result = result.filter((p) => p.listId === listFilter);
    return result;
  }, [places, ownerFilter, listFilter]);

  return {
    places: filtered,
    loading,
    owners,
    ownerFilter,
    setOwnerFilter,
    ownerLists,
    ownerListsLoading,
    listFilter,
    setListFilter,
  };
}

// Show a search box inside the picker once the option list gets long enough to
// scroll uncomfortably (e.g. someone who follows many active mappers, or has
// dozens of lists).
const SEARCH_THRESHOLD = 8;

type DropdownItem = { id: string; label: string };

// A compact trigger that opens a modal picker (searchable when long). Reused by
// both the person and list filters, so each scales to hundreds of options.
function FilterDropdown({
  title,
  icon,
  allLabel,
  searchPlaceholder,
  options,
  value,
  onSelect,
  loading = false,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  allLabel: string;
  searchPlaceholder: string;
  options: DropdownItem[];
  value: string | null;
  onSelect: (id: string | null) => void;
  loading?: boolean;
}) {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const showSearch = options.length > SEARCH_THRESHOLD;
  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options),
    [options, q],
  );

  const currentLabel = value ? options.find((o) => o.id === value)?.label ?? allLabel : allLabel;
  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const choose = (id: string | null) => {
    onSelect(id);
    close();
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${title}. Currently ${currentLabel}.`}
      >
        <Ionicons name={icon} size={14} color={Star.ink} />
        <Text style={styles.triggerText} numberOfLines={1}>
          {currentLabel}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={Star.textMuted} />
        ) : (
          <Ionicons name="chevron-down" size={16} color={Star.textMuted} />
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{title}</Text>
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
                  placeholder={searchPlaceholder}
                  placeholderTextColor={Star.textMuted}
                  style={styles.searchInput}
                  autoCorrect={false}
                  autoFocus
                />
              </View>
            ) : null}

            <ScrollView style={styles.optionScroll} keyboardShouldPersistTaps="handled">
              {!q ? <OptionRow label={allLabel} active={value === null} onPress={() => choose(null)} /> : null}
              {matches.map((o) => (
                <OptionRow key={o.id} label={o.label} active={value === o.id} onPress={() => choose(o.id)} />
              ))}
              {q && matches.length === 0 ? <Text style={styles.noMatch}>Nothing matches “{query.trim()}”.</Text> : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// The Near Me filter row: pick a person, then (once picked) one of their lists.
// Renders nothing until there are at least two people to choose between.
export function NearbyFilters({
  owners,
  ownerFilter,
  onSelectOwner,
  ownerLists,
  ownerListsLoading,
  listFilter,
  onSelectList,
}: {
  owners: OwnerOption[];
  ownerFilter: string | null;
  onSelectOwner: (id: string | null) => void;
  ownerLists: OwnerList[];
  ownerListsLoading: boolean;
  listFilter: string | null;
  onSelectList: (id: string | null) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  if (owners.length < 2) return null;

  return (
    <View style={styles.filterRow}>
      <FilterDropdown
        title="Show places from"
        icon="filter"
        allLabel="Everyone"
        searchPlaceholder="Search people"
        options={owners}
        value={ownerFilter}
        onSelect={onSelectOwner}
      />
      {ownerFilter ? (
        <FilterDropdown
          title="Show which list"
          icon="list"
          allLabel="All lists"
          searchPlaceholder="Search lists"
          options={ownerLists.map((l) => ({ id: l.id, label: l.title }))}
          value={listFilter}
          onSelect={onSelectList}
          loading={ownerListsLoading}
        />
      ) : null}
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
  emptyTitle = "Nothing nearby",
  emptyBody = "No saved places around here yet. Add some, or follow people who have.",
}: {
  places: NearbyPlace[];
  loading: boolean;
  onPressPlace: (id: string) => void;
  emptyTitle?: string;
  emptyBody?: string;
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
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptyBody}>{emptyBody}</Text>
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
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
  },
  trigger: {
    alignSelf: "flex-start",
    maxWidth: 240,
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
