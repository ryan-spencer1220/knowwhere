import { Image, type ImageStyle } from "expo-image";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";

export function Avatar({
  url,
  initials,
  size = 72,
  style,
}: {
  url?: string | null;
  initials: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const base = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.28),
    borderWidth: 2.5,
    borderColor: Star.ink,
  };

  if (url) {
    return <Image source={{ uri: url }} style={[base, style] as unknown as StyleProp<ImageStyle>} contentFit="cover" transition={150} />;
  }

  return (
    <View style={[base, styles.fallback, style]}>
      <Text style={[styles.initials, { fontSize: Math.round(size * 0.36) }]}>{initials}</Text>
    </View>
  );
}

export function initialsFrom(name: string | null, username: string | null): string {
  const value = (name || username || "").trim();
  if (!value) return "?";
  const parts = value.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return value.slice(0, 2).toUpperCase();
}

const makeStyles = (Star: Palette) => StyleSheet.create({
  fallback: { backgroundColor: Star.pop, alignItems: "center", justifyContent: "center" },
  initials: { fontWeight: "900", color: Star.surface },
});
