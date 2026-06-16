import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";
import { AddFlowOverlays, useAddFlow } from "./shared";

// Maps are native-only; web shows a placeholder so the overlay UI is still
// previewable. The real interactive map renders on iOS/Android.
export function AddFlow() {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const flow = useAddFlow();
  return (
    <View style={styles.fill}>
      <View style={styles.placeholder}>
        <Ionicons name="map" size={40} color={Star.ink} />
        <Text style={styles.placeholderText}>Map preview (native only)</Text>
      </View>
      <AddFlowOverlays flow={flow} />
    </View>
  );
}

const makeStyles = (Star: Palette) => StyleSheet.create({
  fill: { flex: 1, backgroundColor: Star.base },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    opacity: 0.4,
  },
  placeholderText: { fontSize: 15, fontWeight: "700", color: Star.ink },
});
