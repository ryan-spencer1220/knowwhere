import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FLOATING_TAB_BAR_SPACE } from "@/lib/layout";
import { useTheme, type Palette } from "@/lib/theme";

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

/**
 * Floating pill tab bar in the app's chunky, neo-brutalist style: a solid white
 * pill with a thick ink border and a hard offset shadow (the same treatment as
 * the shared Card), hovering above the bottom safe area. Passed to expo-router's
 * Tabs via the `tabBar` prop.
 */
export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const Star = useTheme();
  const styles = makeStyles(Star);

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 10 }]} pointerEvents="box-none">
      {/* Ink layer sits behind and is revealed by the pill's offset as a hard shadow. */}
      <View style={styles.shadow}>
        <View style={styles.pill}>
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
        </View>
      </View>
    </View>
  );
}

const makeStyles = (Star: Palette) =>
  StyleSheet.create({
    wrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
    // Hard offset shadow: a solid ink slab the pill floats above and to the
    // upper-left of, matching the Card shadow treatment used across the app.
    shadow: { borderRadius: 34, backgroundColor: Star.ink },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Star.surface,
      borderRadius: 32,
      borderWidth: 2.5,
      borderColor: Star.ink,
      paddingHorizontal: 12,
      paddingVertical: 9,
      gap: 8,
      transform: [{ translateX: -3 }, { translateY: -4 }],
    },
    item: { alignItems: "center", justifyContent: "center" },
    iconWrap: { width: 52, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 20 },
    // Soft violet fill behind the active tab, echoing the focused-field look.
    iconWrapActive: { backgroundColor: Star.blush },
  });
