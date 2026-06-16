import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";

export type MapPlace = { id: string; name: string; latitude: number; longitude: number };

// Maps are native-only; web shows a placeholder so the rest of the detail
// screen stays previewable.
export function ListMap({ places }: { places: MapPlace[] }) {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      <Ionicons name="map" size={34} color={Star.ink} style={styles.icon} />
      <Text style={styles.text}>
        {places.length} {places.length === 1 ? "pin" : "pins"} on the map (native only)
      </Text>
    </View>
  );
}

const makeStyles = (Star: Palette) => StyleSheet.create({
  wrap: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: Star.ink,
    backgroundColor: Star.base,
  },
  icon: { opacity: 0.5 },
  text: { fontSize: 14, fontWeight: "700", color: Star.ink, opacity: 0.6 },
});
