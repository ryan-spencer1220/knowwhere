import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Texture } from "@/components/ui/kit";
import { captureError } from "@/lib/sentry";
import { useThemedStyles, type Palette } from "@/lib/theme";

/**
 * Themed fallback for expo-router's `ErrorBoundary`. Instead of a redbox (dev)
 * or a blank white screen (production) when a screen throws during render, the
 * user gets a friendly message and a button to retry the route.
 *
 * expo-router passes `{ error, retry }` to any `ErrorBoundary` a route/layout
 * exports; re-export this from `app/_layout.tsx` to cover the whole app.
 */
export function AppErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  const styles = useThemedStyles(makeStyles);

  // Report the crash (no-op until a Sentry DSN is configured).
  useEffect(() => captureError(error), [error]);

  return (
    <View style={styles.root}>
      <Texture />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.body}>
          <Text style={styles.emoji}>★</Text>
          <Text style={styles.title}>Something broke</Text>
          <Text style={styles.subtitle}>
            An unexpected error stopped this screen from loading. You can try again.
          </Text>
          {__DEV__ ? <Text style={styles.detail}>{error.message}</Text> : null}
          <Button label="Try again" onPress={() => retry()} style={styles.button} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (Star: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: Star.base },
    safe: { flex: 1 },
    body: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 12 },
    emoji: { fontSize: 44, color: Star.pop },
    title: { fontSize: 26, fontWeight: "900", color: Star.ink, letterSpacing: -0.5 },
    subtitle: { fontSize: 15, fontWeight: "600", color: Star.textMuted, textAlign: "center", lineHeight: 21 },
    detail: { fontSize: 12, fontWeight: "600", color: Star.danger, textAlign: "center", marginTop: 4 },
    button: { alignSelf: "stretch", marginTop: 12 },
  });
