import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { toFriendlyMessage } from "@/lib/errors";
import { addPlaceToList } from "@/lib/lists";
import { fetchDetails, fetchPredictions, type Prediction } from "@/lib/places-search";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";

/**
 * Owner-only control on the list detail screen: a collapsed "Add a place"
 * button that expands into a Places search. Picking a result appends it to the
 * list and calls onAdded() so the screen refetches.
 */
export function AddPlaceToList({
  listId,
  existingGoogleIds,
  nextPosition,
  onAdded,
}: {
  listId: string;
  existingGoogleIds: string[];
  nextPosition: number;
  onAdded: () => void;
}) {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced autocomplete as the user types.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setPredictions([]);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      fetchPredictions(q)
        .then((p) => active && setPredictions(p))
        .catch(() => active && setError("Couldn't search places. Check your connection."));
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setPredictions([]);
    setError(null);
  };

  const add = async (p: Prediction) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const spot = await fetchDetails(p.placeId);
      if (!spot) throw new Error("Couldn't load that place.");
      if (existingGoogleIds.includes(spot.id)) {
        setError("That place is already in this list.");
        return;
      }
      await addPlaceToList(listId, spot, nextPosition);
      setQuery("");
      setPredictions([]);
      onAdded();
    } catch (e) {
      setError(toFriendlyMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Add a place"
      >
        <Ionicons name="add-circle" size={20} color={Star.pop} />
        <Text style={styles.addBtnText}>Add a place</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={Star.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search for a place"
          placeholderTextColor={Star.textMuted}
          style={styles.input}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
        />
        <Pressable onPress={close} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close search">
          <Ionicons name="close" size={20} color={Star.ink} />
        </Pressable>
      </View>

      {busy ? <ActivityIndicator color={Star.ink} style={styles.busy} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {predictions.map((p) => (
        <Pressable
          key={p.placeId}
          onPress={() => add(p)}
          disabled={busy}
          style={({ pressed }) => [styles.result, pressed && styles.resultPressed]}
        >
          <Ionicons name="location-outline" size={16} color={Star.ink} />
          <View style={styles.flex}>
            <Text style={styles.resultPrimary} numberOfLines={1}>
              {p.primary}
            </Text>
            {p.secondary ? (
              <Text style={styles.resultSecondary} numberOfLines={1}>
                {p.secondary}
              </Text>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const makeStyles = (Star: Palette) =>
  StyleSheet.create({
    pressed: { opacity: 0.7 },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: Star.ink,
      borderStyle: "dashed",
      backgroundColor: Star.surface,
    },
    addBtnText: { fontSize: 15, fontWeight: "800", color: Star.ink },
    panel: {
      borderRadius: 16,
      borderWidth: 2,
      borderColor: Star.ink,
      backgroundColor: Star.surface,
      padding: 12,
      gap: 8,
    },
    searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    input: { flex: 1, fontSize: 16, fontWeight: "600", color: Star.text, paddingVertical: 4 },
    busy: { marginVertical: 8 },
    error: { fontSize: 13, fontWeight: "700", color: Star.danger },
    flex: { flex: 1 },
    result: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderTopWidth: 1.5,
      borderTopColor: "rgba(20,18,16,0.08)",
    },
    resultPressed: { opacity: 0.6 },
    resultPrimary: { fontSize: 15, fontWeight: "800", color: Star.ink },
    resultSecondary: { fontSize: 13, fontWeight: "500", color: Star.textMuted, marginTop: 1 },
  });
