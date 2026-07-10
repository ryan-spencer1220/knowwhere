import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Field } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth";
import { FLOATING_TAB_BAR_SPACE } from "@/lib/layout";
import { fetchDetails, fetchPredictions, type Prediction, type Spot } from "@/lib/places-search";
import { saveList } from "@/lib/lists-write";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";

export type { Prediction, Spot };

// Default map view (San Francisco) until real geolocation is wired.
export const INITIAL_REGION = {
  latitude: 37.773,
  longitude: -122.431,
  latitudeDelta: 0.09,
  longitudeDelta: 0.09,
};

// All add-flow state + actions, shared by the native and web screens.
export function useAddFlow() {
  const { session } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selected, setSelected] = useState<Spot | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [listName, setListName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadyAdded = (id: string) => spots.some((s) => s.id === id);

  // Debounced autocomplete as the user types (skipped while a result is chosen).
  useEffect(() => {
    if (selected) {
      setPredictions([]);
      return;
    }
    const q = query.trim();
    if (q.length < 2) {
      setPredictions([]);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      fetchPredictions(q)
        .then((preds) => {
          if (active) setPredictions(preds);
        })
        .catch(() => {});
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, selected]);

  const selectResult = async (p: Prediction) => {
    setPredictions([]);
    setQuery(p.primary);
    const spot = await fetchDetails(p.placeId);
    if (spot) setSelected(spot);
  };
  const clearSearch = () => {
    setSelected(null);
    setQuery("");
  };
  // Drop the current selection but keep whatever the user is typing.
  const deselect = () => setSelected(null);
  const addSelected = () => {
    if (!selected || alreadyAdded(selected.id)) return;
    setSpots((prev) => [...prev, selected]);
    setSelected(null);
    setQuery("");
  };
  const removeSpot = (id: string) => setSpots((prev) => prev.filter((s) => s.id !== id));

  const save = async () => {
    setError(null);
    if (spots.length === 0) {
      setError("Add at least one spot.");
      return;
    }
    if (!listName.trim()) {
      setError("Name your list.");
      return;
    }
    if (!session) {
      setError("You need to be signed in.");
      return;
    }
    setSaving(true);
    try {
      await saveList({ ownerId: session.user.id, title: listName, isPublic, spots });

      setSpots([]);
      setListName("");
      setIsPublic(true);
      clearSearch();
      router.push("/(tabs)/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the list.");
    } finally {
      setSaving(false);
    }
  };

  return {
    query,
    setQuery,
    predictions,
    selected,
    selectResult,
    clearSearch,
    deselect,
    spots,
    addSelected,
    removeSpot,
    alreadyAdded,
    listName,
    setListName,
    isPublic,
    setIsPublic,
    saving,
    error,
    save,
  };
}

export type AddFlow = ReturnType<typeof useAddFlow>;

// The floating UI rendered on top of the map (or the web placeholder).
export function AddFlowOverlays({ flow }: { flow: AddFlow }) {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const hasSelected = flow.selected && !flow.alreadyAdded(flow.selected.id);
  // Offer the import shortcut only on a clean slate, so it never covers results.
  // Native-only: file picking + reading isn't wired for the web preview.
  const showImport =
    Platform.OS !== "web" &&
    flow.query.length === 0 &&
    flow.predictions.length === 0 &&
    flow.spots.length === 0 &&
    !flow.selected;

  return (
    <>
      {/* Search bar + results */}
      <View style={[styles.searchWrap, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Star.textMuted} />
          <TextInput
            value={flow.query}
            onChangeText={(t) => {
              flow.setQuery(t);
              if (flow.selected) flow.deselect();
            }}
            placeholder="Search for a place to add"
            placeholderTextColor={Star.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {flow.query.length > 0 ? (
            <Pressable onPress={flow.clearSearch} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={Star.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {flow.predictions.length > 0 ? (
          <View style={styles.results}>
            {flow.predictions.map((p, i) => (
              <Pressable key={p.placeId} onPress={() => flow.selectResult(p)} style={[styles.resultRow, i > 0 && styles.resultDivider]}>
                <Ionicons name="location" size={16} color={Star.pop} />
                <View style={styles.flex}>
                  <Text style={styles.resultName}>{p.primary}</Text>
                  {p.secondary ? <Text style={styles.resultAddress}>{p.secondary}</Text> : null}
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {showImport ? (
          <Pressable onPress={() => router.push("/import")} style={styles.importBtn}>
            <Ionicons name="cloud-upload-outline" size={18} color={Star.ink} />
            <Text style={styles.importText}>Import a list from Google Maps</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Bottom: selected-spot card and/or list builder */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + FLOATING_TAB_BAR_SPACE }]} pointerEvents="box-none">
        {hasSelected ? (
          <View style={styles.sheet}>
            <View style={styles.flex}>
              <Text style={styles.spotName}>{flow.selected!.name}</Text>
              <Text style={styles.spotAddress}>{flow.selected!.address}</Text>
            </View>
            <Button label="Add spot" onPress={flow.addSelected} style={styles.addBtn} />
          </View>
        ) : null}

        {flow.spots.length > 0 ? (
          <View style={[styles.sheet, styles.builder]}>
            <Text style={styles.builderTitle}>
              {flow.spots.length} {flow.spots.length === 1 ? "spot" : "spots"} added
            </Text>
            <View style={styles.chips}>
              {flow.spots.map((s) => (
                <Pressable key={s.id} onPress={() => flow.removeSpot(s.id)} style={styles.chip}>
                  <Text style={styles.chipText}>{s.name}</Text>
                  <Ionicons name="close" size={13} color={Star.ink} />
                </Pressable>
              ))}
            </View>
            <Field placeholder="Name your list" value={flow.listName} onChangeText={flow.setListName} />

            <View style={styles.visRow}>
              {([
                { value: true, label: "Public", icon: "globe-outline" as const },
                { value: false, label: "Private", icon: "lock-closed-outline" as const },
              ]).map((opt) => {
                const active = flow.isPublic === opt.value;
                return (
                  <Pressable key={opt.label} onPress={() => flow.setIsPublic(opt.value)} style={[styles.visOption, active && styles.visOptionActive]}>
                    <Ionicons name={opt.icon} size={15} color={active ? Star.surface : Star.ink} />
                    <Text style={[styles.visText, active && styles.visTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.visHint}>
              {flow.isPublic ? "Anyone can find and view this list." : "Only you can see this list."}
            </Text>

            {flow.error ? <Text style={styles.error}>{flow.error}</Text> : null}
            <Button label="Create list" onPress={flow.save} loading={flow.saving} />
          </View>
        ) : null}
      </View>
    </>
  );
}

const makeStyles = (Star: Palette) => StyleSheet.create({
  flex: { flex: 1 },
  searchWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Star.surface,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: Star.ink,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: Star.text,
  },
  results: {
    backgroundColor: Star.surface,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: Star.ink,
    overflow: "hidden",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resultDivider: { borderTopWidth: 1.5, borderTopColor: Star.border },
  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Star.surface,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: Star.ink,
    paddingVertical: 12,
  },
  importText: { fontSize: 14, fontWeight: "800", color: Star.ink },
  resultName: { fontSize: 15, fontWeight: "800", color: Star.ink },
  resultAddress: { fontSize: 13, fontWeight: "500", color: Star.textMuted },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    gap: 12,
  },
  sheet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Star.surface,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: Star.ink,
    padding: 14,
  },
  spotName: { fontSize: 16, fontWeight: "800", color: Star.ink },
  spotAddress: { fontSize: 13, fontWeight: "500", color: Star.textMuted },
  addBtn: { paddingHorizontal: 22, paddingVertical: 12 },
  builder: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 12,
  },
  builderTitle: { fontSize: 17, fontWeight: "900", color: Star.ink, letterSpacing: -0.3 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Star.base,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Star.ink,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { fontSize: 13, fontWeight: "700", color: Star.ink },
  visRow: { flexDirection: "row", gap: 8 },
  visOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Star.ink,
    backgroundColor: Star.surface,
  },
  visOptionActive: { backgroundColor: Star.ink },
  visText: { fontSize: 14, fontWeight: "800", color: Star.ink },
  visTextActive: { color: Star.surface },
  visHint: { fontSize: 12, fontWeight: "500", color: Star.textMuted, marginTop: -4 },
  error: { color: Star.danger, fontSize: 13, fontWeight: "700" },
});
