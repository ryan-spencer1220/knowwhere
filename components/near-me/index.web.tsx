import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Texture } from "@/components/ui/kit";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";
import { DEFAULT_CENTER, NearbyFilters, NearbyList, NearMeHeader, useNearbyPlaces } from "./shared";

// Map is native-only; web previews the header + nearby list using the default
// center (real geolocation + map render on device).
export function NearMe() {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { places, loading, owners, ownerFilter, setOwnerFilter, ownerLists, ownerListsLoading, listFilter, setListFilter } =
    useNearbyPlaces(DEFAULT_CENTER);

  const emptyList = listFilter != null && !loading && places.length === 0;

  return (
    <View style={styles.root}>
      <Texture />
      <SafeAreaView edges={["top"]}>
        <NearMeHeader />
      </SafeAreaView>
      <View style={styles.placeholder}>
        <Ionicons name="map" size={34} color={Star.ink} style={styles.icon} />
        <Text style={styles.text}>{emptyList ? "Nothing nearby in this list." : "Map preview (native only)"}</Text>
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
        onPressPlace={(id) => router.push({ pathname: "/place/[id]", params: { id } })}
        emptyTitle={emptyList ? "Nothing nearby in this list" : undefined}
        emptyBody={emptyList ? "None of this list's places are within range of where you are right now." : undefined}
      />
    </View>
  );
}

const makeStyles = (Star: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: Star.base },
  placeholder: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: Star.ink,
  },
  icon: { opacity: 0.5 },
  text: { fontSize: 14, fontWeight: "700", color: Star.ink, opacity: 0.6 },
});
