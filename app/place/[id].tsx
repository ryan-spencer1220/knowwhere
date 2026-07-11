import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, ErrorState, IconButton, Pill, Texture } from "@/components/ui/kit";
import { formatTypes, getPlaceScreen, priceLabel, type PlaceScreenData } from "@/lib/places";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";
import { useFocusQuery } from "@/lib/use-focus-query";

export default function PlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { data, loading, error, refetch } = useFocusQuery<PlaceScreenData | null>(() =>
    id ? getPlaceScreen(id) : Promise.resolve(null),
  );

  const stored = data?.stored;
  const profile = data?.profile;
  const name = profile?.name ?? stored?.name ?? "Place";
  const address = profile?.address ?? stored?.address ?? null;
  const photoUri = profile?.photoUri ?? null;
  const types = profile ? formatTypes(profile.types) : [];
  const price = priceLabel(profile?.priceLevel ?? null);
  const mapsUri =
    profile?.googleMapsUri ??
    (stored?.latitude != null && stored?.longitude != null
      ? `https://maps.google.com/?q=${stored.latitude},${stored.longitude}`
      : null);

  return (
    <View style={styles.root}>
      <Texture />
      {/* Hero */}
      <View style={styles.hero}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Ionicons name="location" size={48} color={Star.ink} />
          </View>
        )}
        <SafeAreaView edges={["top"]} style={styles.heroSafe}>
          <IconButton icon="chevron-back" onPress={() => router.back()} accessibilityLabel="Back" />
        </SafeAreaView>
      </View>

      {loading ? (
        <ActivityIndicator color={Star.ink} style={styles.loader} />
      ) : error || !stored ? (
        <View style={styles.centerPad}>
          <ErrorState message={error ?? "Could not load this place."} onRetry={refetch} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{name}</Text>

          {/* Rating / price / open-now */}
          {profile && (profile.rating || price || profile.openNow != null) ? (
            <View style={styles.statRow}>
              {profile.rating ? (
                <Text style={styles.rating}>
                  ★ {profile.rating.toFixed(1)}
                  {profile.userRatingCount ? <Text style={styles.ratingCount}> ({profile.userRatingCount.toLocaleString()})</Text> : null}
                </Text>
              ) : null}
              {price ? <Text style={styles.dot}>·</Text> : null}
              {price ? <Text style={styles.price}>{price}</Text> : null}
              {profile.openNow != null ? (
                <View style={[styles.openBadge, profile.openNow ? styles.openNow : styles.closed]}>
                  <Text style={[styles.openText, profile.openNow ? styles.openTextNow : styles.openTextClosed]}>
                    {profile.openNow ? "Open now" : "Closed"}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {types.length > 0 ? (
            <View style={styles.pillRow}>
              {types.map((t) => (
                <Pill key={t} label={t} />
              ))}
            </View>
          ) : null}

          {profile?.summary ? <Text style={styles.summary}>{profile.summary}</Text> : null}

          {/* Note from the list */}
          {stored.note ? (
            <Card style={styles.noteCard}>
              <Text style={styles.noteLabel}>NOTE</Text>
              <Text style={styles.noteText}>{stored.note}</Text>
            </Card>
          ) : null}

          {/* Actions */}
          {address ? (
            <Pressable onPress={() => mapsUri && Linking.openURL(mapsUri)} disabled={!mapsUri}>
              <Card style={styles.actionCard}>
                <Ionicons name="location-outline" size={20} color={Star.pop} />
                <Text style={styles.actionText}>{address}</Text>
                {mapsUri ? <Ionicons name="open-outline" size={18} color={Star.textMuted} /> : null}
              </Card>
            </Pressable>
          ) : null}

          {profile?.phone ? (
            <Pressable onPress={() => Linking.openURL(`tel:${profile.phone}`)}>
              <Card style={styles.actionCard}>
                <Ionicons name="call-outline" size={20} color={Star.pop} />
                <Text style={styles.actionText}>{profile.phone}</Text>
              </Card>
            </Pressable>
          ) : null}

          {profile?.website ? (
            <Pressable onPress={() => Linking.openURL(profile.website!)}>
              <Card style={styles.actionCard}>
                <Ionicons name="globe-outline" size={20} color={Star.pop} />
                <Text style={styles.actionText} numberOfLines={1}>
                  {profile.website.replace(/^https?:\/\//, "")}
                </Text>
                <Ionicons name="open-outline" size={18} color={Star.textMuted} />
              </Card>
            </Pressable>
          ) : null}

          {/* Hours */}
          {profile?.weekdayText && profile.weekdayText.length > 0 ? (
            <Card style={styles.hoursCard}>
              <Text style={styles.hoursTitle}>Hours</Text>
              {profile.weekdayText.map((line) => (
                <Text key={line} style={styles.hoursLine}>
                  {line}
                </Text>
              ))}
            </Card>
          ) : null}

          {!profile && stored.googlePlaceId == null ? (
            <Text style={styles.fallbackNote}>Live details aren&apos;t available for this place.</Text>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const HERO_HEIGHT = 260;

const makeStyles = (Star: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: Star.base },
  hero: { height: HERO_HEIGHT, backgroundColor: Star.blush, borderBottomWidth: 2.5, borderBottomColor: Star.ink },
  heroPlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  heroSafe: { paddingHorizontal: 12, paddingTop: 4 },
  loader: { marginTop: 40 },
  centerPad: { padding: 20 },
  scroll: { padding: 20, paddingBottom: 40, gap: 12 },
  title: { fontSize: 28, fontWeight: "900", color: Star.ink, letterSpacing: -0.7 },
  statRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  rating: { fontSize: 16, fontWeight: "800", color: Star.ink },
  ratingCount: { fontWeight: "600", color: Star.textMuted },
  dot: { color: Star.textMuted, fontWeight: "800" },
  price: { fontSize: 16, fontWeight: "800", color: Star.ink },
  openBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1.5, borderColor: Star.ink },
  openNow: { backgroundColor: Star.base },
  closed: { backgroundColor: Star.surface },
  openText: { fontSize: 12, fontWeight: "800" },
  openTextNow: { color: Star.ink },
  openTextClosed: { color: Star.danger },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summary: { fontSize: 15, fontWeight: "500", color: Star.text, lineHeight: 22 },
  noteCard: { gap: 4, backgroundColor: Star.blush },
  noteLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: Star.pop },
  noteText: { fontSize: 15, fontWeight: "500", color: Star.ink, lineHeight: 21 },
  actionCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  actionText: { flex: 1, fontSize: 15, fontWeight: "600", color: Star.ink },
  hoursCard: { gap: 4 },
  hoursTitle: { fontSize: 16, fontWeight: "900", color: Star.ink, marginBottom: 2 },
  hoursLine: { fontSize: 14, fontWeight: "500", color: Star.textMuted },
  fallbackNote: { fontSize: 13, fontWeight: "500", color: Star.textMuted, textAlign: "center", marginTop: 8 },
});
