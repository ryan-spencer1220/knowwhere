import { useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";

export type MapPlace = { id: string; name: string; latitude: number; longitude: number };

export function ListMap({ places }: { places: MapPlace[] }) {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const mapRef = useRef<MapView>(null);

  const fit = () => {
    if (places.length === 1) {
      mapRef.current?.animateToRegion(
        { latitude: places[0].latitude, longitude: places[0].longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        0,
      );
    } else if (places.length > 1) {
      mapRef.current?.fitToCoordinates(
        places.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
        { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: false },
      );
    }
  };

  const initialRegion = places[0]
    ? { latitude: places[0].latitude, longitude: places[0].longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : { latitude: 37.773, longitude: -122.431, latitudeDelta: 0.09, longitudeDelta: 0.09 };

  return (
    <View style={styles.wrap}>
      <MapView ref={mapRef} style={StyleSheet.absoluteFill} provider={PROVIDER_DEFAULT} initialRegion={initialRegion} onMapReady={fit}>
        {places.map((p) => (
          <Marker key={p.id} coordinate={{ latitude: p.latitude, longitude: p.longitude }} title={p.name} pinColor={Star.pop} />
        ))}
      </MapView>
    </View>
  );
}

const makeStyles = (Star: Palette) => StyleSheet.create({
  wrap: {
    height: 280,
    borderBottomWidth: 2,
    borderBottomColor: Star.ink,
    backgroundColor: Star.base,
  },
});
