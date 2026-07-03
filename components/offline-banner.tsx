import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemedStyles, type Palette } from "@/lib/theme";

/**
 * Thin banner pinned below the status bar whenever the device loses its
 * connection, so a failed request reads as "you're offline" rather than a
 * mysterious error. Mounted once at the root; renders nothing while online.
 */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isInternetReachable can be null while unknown — only treat an explicit
      // false (or a disconnected transport) as offline to avoid false alarms.
      setOffline(state.isConnected === false || state.isInternetReachable === false);
    });
    return unsubscribe;
  }, []);

  if (!offline) return null;

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 6 }]} pointerEvents="none">
      <Text style={styles.text}>You&apos;re offline — some things may not load.</Text>
    </View>
  );
}

const makeStyles = (Star: Palette) =>
  StyleSheet.create({
    banner: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      backgroundColor: Star.ink,
      paddingBottom: 8,
      paddingHorizontal: 16,
      alignItems: "center",
    },
    text: {
      color: Star.pop,
      fontSize: 13,
      fontWeight: "800",
    },
  });
