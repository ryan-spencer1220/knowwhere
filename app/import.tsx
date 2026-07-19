import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Field, IconButton, Texture } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth";
import {
  fetchSharedList,
  listNameFromFile,
  parseTakeoutCsv,
  resolveRows,
  type ResolvedRow,
} from "@/lib/import-list";
import { saveList } from "@/lib/lists-write";
import { fetchDetails, fetchPredictions, type Prediction, type Spot } from "@/lib/places-search";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";

// One reviewable entry: the original imported row plus the place we matched it
// to (if any) and whether the user wants to keep it.
type Entry = { title: string; spot: Spot | null; included: boolean };

type Phase =
  | { step: "idle" }
  // `label` drives the indeterminate link import; `done`/`total` drive the CSV match progress.
  | { step: "resolving"; done?: number; total?: number; label?: string }
  | { step: "review" };

export default function ImportScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const [link, setLink] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [listName, setListName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const includedCount = useMemo(() => entries.filter((e) => e.included && e.spot).length, [entries]);
  const unmatchedCount = useMemo(() => entries.filter((e) => !e.spot).length, [entries]);

  const importLink = async () => {
    setError(null);
    const url = link.trim();
    if (!url) {
      setError("Paste your Google Maps list link first.");
      return;
    }
    setPhase({ step: "resolving", label: "Reading your list…" });
    try {
      const { rows, listName: name } = await fetchSharedList(url);
      if (rows.length === 0) {
        setError(
          "Couldn't read that list. Make sure it's shared with a public link (open the list in Google Maps → Share), or import a CSV instead.",
        );
        setPhase({ step: "idle" });
        return;
      }
      if (name) setListName(name);
      setEntries(rows.map(toEntry));
      setPhase({ step: "review" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that list.");
      setPhase({ step: "idle" });
    }
  };

  const pickFile = async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "application/json", "text/plain"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const text = await new File(asset.uri).text();

      const rows = parseTakeoutCsv(text);
      if (rows.length === 0) {
        setError("No places found in that file. Export a saved list from Google Takeout as CSV.");
        return;
      }

      setListName(listNameFromFile(asset.name));
      setPhase({ step: "resolving", done: 0, total: rows.length });
      const resolved = await resolveRows(rows, (done, total) => setPhase({ step: "resolving", done, total }));
      setEntries(resolved.map(toEntry));
      setPhase({ step: "review" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
      setPhase({ step: "idle" });
    }
  };

  const toggle = (i: number) =>
    setEntries((prev) => prev.map((e, idx) => (idx === i && e.spot ? { ...e, included: !e.included } : e)));

  const fixEntry = (i: number, spot: Spot) =>
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, spot, included: true } : e)));

  const create = async () => {
    setError(null);
    if (!session) {
      setError("You need to be signed in.");
      return;
    }
    if (!listName.trim()) {
      setError("Name your list.");
      return;
    }
    // De-dupe in case two rows resolved to the same place.
    const spots: Spot[] = [];
    const seen = new Set<string>();
    for (const e of entries) {
      if (e.included && e.spot && !seen.has(e.spot.id)) {
        seen.add(e.spot.id);
        spots.push(e.spot);
      }
    }
    if (spots.length === 0) {
      setError("Include at least one place.");
      return;
    }
    setSaving(true);
    try {
      await saveList({ ownerId: session.user.id, title: listName, isPublic, spots });
      router.replace("/(tabs)/profile");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the list.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <Texture />
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <IconButton icon="chevron-back" onPress={() => router.back()} accessibilityLabel="Back" />
          <Text style={styles.headerTitle}>Import a list</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {phase.step === "idle" ? (
          <View style={styles.intro}>
            <Ionicons name="link-outline" size={40} color={Star.ink} />
            <Text style={styles.introTitle}>Bring over a Google Maps list</Text>
            <Text style={styles.introBody}>
              In Google Maps, open your list, tap <Text style={styles.bold}>Share</Text>, and copy the link. Paste it below and we&apos;ll
              pull in every place so you can review before saving.
            </Text>
            <View style={styles.form}>
              <Field
                label="LIST LINK"
                placeholder="Paste your Google Maps list link"
                value={link}
                onChangeText={setLink}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Button label="Import list" onPress={importLink} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.orLine} />
              </View>
              <Pressable onPress={pickFile} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
                <Ionicons name="document-text-outline" size={16} color={Star.ink} />
                <Text style={styles.secondaryText}>Import a Takeout CSV instead</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {phase.step === "resolving" ? (
          <View style={styles.intro}>
            <ActivityIndicator size="large" color={Star.pop} />
            <Text style={styles.introTitle}>
              {phase.total ? `Matching ${phase.done} of ${phase.total}…` : phase.label ?? "Working…"}
            </Text>
            <Text style={styles.introBody}>
              {phase.total
                ? "Looking up each place on Google so we can pin it on the map."
                : "Reading the places in your shared list. This can take a moment."}
            </Text>
          </View>
        ) : null}

        {phase.step === "review" ? (
          <>
            <Text style={styles.summary}>
              {includedCount} of {entries.length} places ready
              {unmatchedCount > 0 ? ` · ${unmatchedCount} need a match` : ""}
            </Text>

            {entries.map((e, i) => (
              <ReviewRow key={i} entry={e} onToggle={() => toggle(i)} onFix={(spot) => fixEntry(i, spot)} />
            ))}

            <Field label="LIST NAME" placeholder="Name your list" value={listName} onChangeText={setListName} />

            <View style={styles.visRow}>
              {([
                { value: true, label: "Public", icon: "globe-outline" as const },
                { value: false, label: "Private", icon: "lock-closed-outline" as const },
              ]).map((opt) => {
                const active = isPublic === opt.value;
                return (
                  <Pressable key={opt.label} onPress={() => setIsPublic(opt.value)} style={[styles.visOption, active && styles.visOptionActive]}>
                    <Ionicons name={opt.icon} size={15} color={active ? Star.surface : Star.ink} />
                    <Text style={[styles.visText, active && styles.visTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label={`Create list (${includedCount})`} onPress={create} loading={saving} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function toEntry(r: ResolvedRow): Entry {
  if (r.status === "matched") return { title: r.row.title, spot: r.spot, included: true };
  return { title: r.row.title, spot: null, included: false };
}

// A single review row: a matched place is a toggleable checkbox; an unmatched
// row exposes an inline search so the user can pick the right place by hand.
function ReviewRow({ entry, onToggle, onFix }: { entry: Entry; onToggle: () => void; onFix: (spot: Spot) => void }) {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [preds, setPreds] = useState<Prediction[]>([]);

  const runSearch = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) {
      setPreds([]);
      return;
    }
    try {
      setPreds(await fetchPredictions(text.trim()));
    } catch {
      setPreds([]);
    }
  };

  const choose = async (p: Prediction) => {
    const spot = await fetchDetails(p.placeId);
    if (spot) {
      onFix(spot);
      setSearching(false);
      setPreds([]);
    }
  };

  if (!entry.spot) {
    return (
      <View style={[styles.row, styles.rowUnmatched]}>
        <View style={styles.rowMain}>
          <Ionicons name="alert-circle" size={18} color={Star.danger} />
          <View style={styles.flex}>
            <Text style={styles.rowName}>{entry.title}</Text>
            <Text style={styles.rowHint}>Couldn&apos;t match automatically</Text>
          </View>
          <Pressable onPress={() => setSearching((s) => !s)} hitSlop={6} style={styles.fixBtn}>
            <Text style={styles.fixBtnText}>{searching ? "Cancel" : "Find it"}</Text>
          </Pressable>
        </View>
        {searching ? (
          <View style={styles.searchArea}>
            <Field placeholder="Search for this place" value={query} onChangeText={runSearch} autoFocus autoCorrect={false} />
            {preds.map((p, i) => (
              <Pressable key={p.placeId} onPress={() => choose(p)} style={[styles.predRow, i > 0 && styles.predDivider]}>
                <Ionicons name="location" size={15} color={Star.pop} />
                <View style={styles.flex}>
                  <Text style={styles.predName}>{p.primary}</Text>
                  {p.secondary ? <Text style={styles.predAddr}>{p.secondary}</Text> : null}
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <Pressable onPress={onToggle} style={styles.row}>
      <View style={styles.rowMain}>
        <Ionicons
          name={entry.included ? "checkbox" : "square-outline"}
          size={22}
          color={entry.included ? Star.pop : Star.textMuted}
        />
        <View style={styles.flex}>
          <Text style={styles.rowName}>{entry.spot.name}</Text>
          {entry.spot.address ? <Text style={styles.rowAddr}>{entry.spot.address}</Text> : null}
        </View>
      </View>
    </Pressable>
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
  scroll: { padding: 20, paddingBottom: 40, gap: 12 },
  intro: { alignItems: "center", gap: 12, paddingVertical: 28, paddingHorizontal: 8 },
  introTitle: { fontSize: 20, fontWeight: "900", color: Star.ink, textAlign: "center", letterSpacing: -0.4 },
  introBody: { fontSize: 14, fontWeight: "500", color: Star.textMuted, textAlign: "center", lineHeight: 20 },
  bold: { fontWeight: "800", color: Star.ink },
  form: { alignSelf: "stretch", gap: 12, marginTop: 8 },
  orRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 2 },
  orLine: { flex: 1, height: 1.5, backgroundColor: Star.border },
  orText: { fontSize: 13, fontWeight: "800", color: Star.textMuted },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Star.ink,
    backgroundColor: Star.surface,
  },
  secondaryText: { fontSize: 14, fontWeight: "800", color: Star.ink },
  summary: { fontSize: 13, fontWeight: "800", color: Star.ink, letterSpacing: 0.2 },
  row: {
    backgroundColor: Star.surface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Star.ink,
    padding: 12,
    gap: 10,
  },
  rowUnmatched: { borderColor: Star.danger },
  rowMain: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowName: { fontSize: 15, fontWeight: "800", color: Star.ink },
  rowAddr: { fontSize: 12, fontWeight: "500", color: Star.textMuted },
  rowHint: { fontSize: 12, fontWeight: "600", color: Star.danger },
  fixBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5, borderColor: Star.ink },
  fixBtnText: { fontSize: 12, fontWeight: "800", color: Star.ink },
  searchArea: { gap: 8 },
  predRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  predDivider: { borderTopWidth: 1.5, borderTopColor: Star.border },
  predName: { fontSize: 14, fontWeight: "800", color: Star.ink },
  predAddr: { fontSize: 12, fontWeight: "500", color: Star.textMuted },
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
  error: { color: Star.danger, fontSize: 13, fontWeight: "700" },
});
