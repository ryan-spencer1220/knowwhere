import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { FLOATING_TAB_BAR_SPACE } from "@/lib/layout";
import { useTheme } from "@/lib/theme";

export { FLOATING_TAB_BAR_SPACE };

type IoniconName = keyof typeof Ionicons.glyphMap;

// Icon per tab route: [active (filled), inactive (outline)].
const ICONS: Record<string, [IoniconName, IoniconName]> = {
  index: ["home", "home-outline"],
  "near-me": ["navigate", "navigate-outline"],
  add: ["add-circle", "add-circle-outline"],
  explore: ["compass", "compass-outline"],
  profile: ["person", "person-outline"],
};

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/**
 * Instagram-style floating pill tab bar: a frosted, semi-transparent, icon-only
 * pill that hovers above the bottom safe area. Passed to expo-router's Tabs via
 * the `tabBar` prop.
 */
export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const Star = useTheme();
  const scheme = useColorScheme();
  const styles = makeStyles(Star);

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 10 }]} pointerEvents="box-none">
      <BlurView intensity={30} tint={scheme === "dark" ? "dark" : "light"} style={styles.pill}>
        <View style={styles.tint} pointerEvents="none" />
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const [active, inactive] = ICONS[route.name] ?? ["ellipse", "ellipse-outline"];

          const onPress = () => {
            if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={route.name}
              style={styles.item}
            >
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Ionicons name={focused ? active : inactive} size={28} color={focused ? Star.pop : Star.textMuted} />
              </View>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const makeStyles = (Star: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    wrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 34,
      overflow: "hidden",
      paddingHorizontal: 12,
      paddingVertical: 9,
      gap: 8,
      borderWidth: 1.5,
      borderColor: rgba(Star.ink, 0.12),
      // Soft lift under the floating bar.
      shadowColor: Star.ink,
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    // Lightens the frosted glass so icons stay legible over any content.
    tint: { ...StyleSheet.absoluteFillObject, backgroundColor: rgba(Star.surface, 0.6) },
    item: { alignItems: "center", justifyContent: "center" },
    iconWrap: { width: 52, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 23 },
    iconWrapActive: { backgroundColor: rgba(Star.pop, 0.14) },
  });
