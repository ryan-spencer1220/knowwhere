import { Ionicons } from "@expo/vector-icons";
import { Image, type ImageStyle } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, type StyleProp } from "react-native";

import { useTheme } from "@/lib/theme";

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// A list's hero image: the stored cover photo when available, otherwise a
// deterministic branded gradient (same list always gets the same look).
export function ListCover({ url, seed, height = 132 }: { url?: string | null; seed: string; height?: number }) {
  const Star = useTheme();

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[styles.image, { height }] as unknown as StyleProp<ImageStyle>}
        contentFit="cover"
        transition={150}
      />
    );
  }

  // Curated on-brand gradient pairs for the generated fallback cover, derived
  // from the active theme so covers recolor with the rest of the UI.
  const GRADIENTS: [string, string][] = [
    [Star.base, Star.pop],
    [Star.pop, Star.popDeep],
    [Star.base, Star.popDeep],
    [Star.popDeep, Star.base],
    [Star.pop, Star.base],
  ];
  const [from, to] = GRADIENTS[hash(seed) % GRADIENTS.length];
  return (
    <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.image, { height }]}>
      <View style={styles.glyphWrap}>
        <Ionicons name="map" size={42} color="rgba(255,255,255,0.9)" />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  image: { width: "100%", alignItems: "center", justifyContent: "center" },
  glyphWrap: { alignItems: "center", justifyContent: "center" },
});
