import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

import { Texture } from "@/components/ui/kit";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";
import { DEFAULT_CENTER, NearbyFilters, NearbyList, NearMeHeader, useNearbyPlaces, type Coords } from "./shared";

export function NearMe() {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [center, setCenter] = useState<Coords>(DEFAULT_CENTER);
  const { places, loading, owners, ownerFilter, setOwnerFilter, ownerLists, ownerListsLoading, listFilter, setListFilter } =
    useNearbyPlaces(center);

  // A list was picked but none of its places fall within the current view.
  const emptyList = listFilter != null && !loading && places.length === 0;

  // Center on the user's real location once granted.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setCenter(next);
        mapRef.current?.animateToRegion({ ...next, latitudeDelta: 0.08, longitudeDelta: 0.08 }, 500);
      } catch {
        // keep default center
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openPlace = (id: string) => router.push({ pathname: "/place/[id]", params: { id } });

  return (
    <View style={styles.root}>
      <Texture />
      <SafeAreaView edges={["top"]}>
        <NearMeHeader />
      </SafeAreaView>

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_DEFAULT}
          initialRegion={{ ...center, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
          showsUserLocation
        >
          {places.map((p) => (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.latitude, longitude: p.longitude }}
              title={p.name}
              description={p.listTitle ?? undefined}
              pinColor={Star.pop}
              onCalloutPress={() => openPlace(p.id)}
            />
          ))}
        </MapView>
        {emptyList ? (
          <View style={styles.mapMessage} pointerEvents="none">
            <Text style={styles.mapMessageText}>Nothing nearby in this list.</Text>
          </View>
        ) : null}
      </View>

      <NearbyFilters
        owners={owners}
        ownerFilter={ownerFilter}
        onSelectOwner={setOwnerFilter}
        ownerLists={ownerLists}
        ownerListsLoading={ownerListsLoading}
        listFilter={listFilter}
        onSelectList={setListFilter}
      />
      <NearbyList
        places={places}
        loading={loading}
        onPressPlace={openPlace}
        emptyTitle={emptyList ? "Nothing nearby in this list" : undefined}
        emptyBody={emptyList ? "None of this list's places are within range of where you are right now." : undefined}
      />
    </View>
  );
}

const makeStyles = (Star: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: Star.base },
  mapWrap: { height: 280, borderTopWidth: 2, borderBottomWidth: 2, borderColor: Star.ink },
  mapMessage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  mapMessageText: {
    fontSize: 15,
    fontWeight: "800",
    color: Star.ink,
    textAlign: "center",
    backgroundColor: Star.surface,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Star.ink,
    paddingHorizontal: 16,
    paddingVertical: 10,
    overflow: "hidden",
  },
});
