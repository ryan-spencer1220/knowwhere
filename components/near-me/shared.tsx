import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth";
import { FLOATING_TAB_BAR_SPACE } from "@/lib/layout";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";
import { getNearbyPlaces, milesLabel, type NearbyPlace } from "@/lib/nearby";

export type Coords = { latitude: number; longitude: number };

// Map default until geolocation resolves (also used as the web center).
export const DEFAULT_CENTER: Coords = { latitude: 37.773, longitude: -122.431 };

export function useNearbyPlaces(center: Coords | null) {
  const { session } = useAuth();
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);

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

  return { places, loading };
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
