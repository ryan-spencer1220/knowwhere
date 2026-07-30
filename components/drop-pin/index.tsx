import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_DEFAULT, type LatLng } from "react-native-maps";

import { Button } from "@/components/ui/kit";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";

export type DroppedPin = { name: string; latitude: number; longitude: number };

// Fallback region until geolocation resolves (San Francisco, matching the app).
const FALLBACK = { latitude: 37.773, longitude: -122.431, latitudeDelta: 0.05, longitudeDelta: 0.05 };

// A full-screen map where the user taps to drop (and drag to fine-tune) a pin
// that isn't backed by a Google Place, then names it. Native only — the web
// build renders the stub in index.web.tsx.
export function DropPinModal({
  visible,
  onClose,
  onConfirm,
  saving = false,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (pin: DroppedPin) => void;
  saving?: boolean;
}) {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [coord, setCoord] = useState<LatLng | null>(null);
  const [name, setName] = useState("");

  // Reset and center on the user's location each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setCoord(null);
    setName("");
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        mapRef.current?.animateToRegion(
          { latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 },
          400,
        );
      } catch {
        // Permission denied or unavailable — keep the fallback region.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const canSave = coord != null && name.trim().length > 0 && !saving;
  const confirm = () => {
    if (!coord || !name.trim()) return;
    onConfirm({ name: name.trim(), latitude: coord.latitude, longitude: coord.longitude });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_DEFAULT}
          initialRegion={FALLBACK}
          showsUserLocation
          onPress={(e) => setCoord(e.nativeEvent.coordinate)}
        >
          {coord ? (
            <Marker coordinate={coord} draggable onDragEnd={(e) => setCoord(e.nativeEvent.coordinate)} pinColor={Star.pop} />
          ) : null}
        </MapView>

        <View style={[styles.header, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <Pressable onPress={onClose} style={styles.headerBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancel">
            <Ionicons name="close" size={22} color={Star.ink} />
          </Pressable>
          <View style={styles.headerPill}>
            <Text style={styles.headerText}>{coord ? "Drag to fine-tune" : "Tap the map to drop a pin"}</Text>
          </View>
        </View>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.sheetTitle}>Name this spot</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. 28th & Glisan"
            placeholderTextColor={Star.textMuted}
            style={styles.input}
            maxLength={120}
            returnKeyType="done"
          />
          <Button label="Add pin to list" onPress={confirm} loading={saving} disabled={!canSave} />
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (Star: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: Star.base },
    header: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
    },
    headerBtn: {
      width: 42,
      height: 42,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: Star.ink,
      backgroundColor: Star.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    headerPill: {
      flexShrink: 1,
      backgroundColor: Star.surface,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: Star.ink,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    headerText: { fontSize: 13, fontWeight: "800", color: Star.ink },
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: Star.surface,
      borderTopWidth: 2.5,
      borderColor: Star.ink,
      padding: 16,
      gap: 12,
    },
    sheetTitle: { fontSize: 17, fontWeight: "900", color: Star.ink, letterSpacing: -0.3 },
    input: {
      fontSize: 16,
      fontWeight: "600",
      color: Star.text,
      backgroundColor: Star.base,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: Star.ink,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
  });
