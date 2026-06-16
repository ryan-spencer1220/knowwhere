import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { HapticTab } from "@/components/haptic-tab";
import { useTheme } from "@/lib/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IoniconName, inactive: IoniconName) {
  const TabBarIcon = ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
  TabBarIcon.displayName = "TabBarIcon";
  return TabBarIcon;
}

export default function TabLayout() {
  const Star = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: Star.pop,
        tabBarInactiveTintColor: Star.textMuted,
        tabBarStyle: {
          backgroundColor: Star.surface,
          borderTopWidth: 2,
          borderTopColor: Star.ink,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontWeight: "800",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Feed", tabBarIcon: tabIcon("home", "home-outline") }} />
      <Tabs.Screen name="near-me" options={{ title: "Near me", tabBarIcon: tabIcon("navigate", "navigate-outline") }} />
      <Tabs.Screen name="add" options={{ title: "Add", tabBarIcon: tabIcon("add-circle", "add-circle-outline") }} />
      <Tabs.Screen name="explore" options={{ title: "Explore", tabBarIcon: tabIcon("compass", "compass-outline") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("person", "person-outline") }} />
    </Tabs>
  );
}
