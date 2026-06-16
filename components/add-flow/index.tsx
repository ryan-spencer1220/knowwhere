import * as Location from "expo-location";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";
import { AddFlowOverlays, INITIAL_REGION, useAddFlow } from "./shared";

export function AddFlow() {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const flow = useAddFlow();
  const mapRef = useRef<MapView>(null);
  // Don't yank the camera back to the user once they've started searching.
  const movedByUser = useRef(false);

  // On mount, center the map on the user's actual location (if permitted).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled || movedByUser.current) return;
        mapRef.current?.animateToRegion(
          { latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 },
          600,
        );
      } catch {
        // Permission denied or location unavailable — keep the default region.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fly to a freshly selected search result.
  useEffect(() => {
    if (flow.selected) {
      movedByUser.current = true;
      mapRef.current?.animateToRegion(
        {
          latitude: flow.selected.latitude,
          longitude: flow.selected.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        450,
      );
    }
  }, [flow.selected]);

  return (
    <View style={styles.fill}>
      <MapView ref={mapRef} style={StyleSheet.absoluteFill} provider={PROVIDER_DEFAULT} initialRegion={INITIAL_REGION} showsUserLocation>
        {flow.spots.map((s) => (
          <Marker key={s.id} coordinate={{ latitude: s.latitude, longitude: s.longitude }} title={s.name} pinColor={Star.ink} />
        ))}
        {flow.selected ? (
          <Marker
            coordinate={{ latitude: flow.selected.latitude, longitude: flow.selected.longitude }}
            title={flow.selected.name}
            pinColor={Star.pop}
          />
        ) : null}
      </MapView>

      <AddFlowOverlays flow={flow} />
    </View>
  );
}

const makeStyles = (Star: Palette) => StyleSheet.create({
  fill: { flex: 1, backgroundColor: Star.base },
});
