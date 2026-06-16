import { supabase } from "@/lib/supabase";

// The place as stored on a list (source of truth + the user's note).
export type StoredPlace = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  googlePlaceId: string | null;
};

// Live details enriched from Google Places (New) via the Edge Function.
export type PlaceProfile = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  userRatingCount: number | null;
  priceLevel: string | null;
  types: string[];
  openNow: boolean | null;
  weekdayText: string[] | null;
  phone: string | null;
  website: string | null;
  summary: string | null;
  googleMapsUri: string | null;
  photoUri: string | null;
};

export async function getStoredPlace(listPlaceId: string): Promise<StoredPlace> {
  const { data, error } = await supabase
    .from("list_places")
    .select("id, name, address, latitude, longitude, note, google_place_id")
    .eq("id", listPlaceId)
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    note: data.note,
    googlePlaceId: data.google_place_id,
  };
}

async function getPlaceProfile(googlePlaceId: string): Promise<PlaceProfile | null> {
  const { data, error } = await supabase.functions.invoke("places", {
    body: { type: "place", placeId: googlePlaceId },
  });
  if (error) throw error;
  return (data?.place ?? null) as PlaceProfile | null;
}

export type PlaceScreenData = { stored: StoredPlace; profile: PlaceProfile | null };

export async function getPlaceScreen(listPlaceId: string): Promise<PlaceScreenData> {
  const stored = await getStoredPlace(listPlaceId);
  let profile: PlaceProfile | null = null;
  if (stored.googlePlaceId) {
    try {
      profile = await getPlaceProfile(stored.googlePlaceId);
    } catch {
      profile = null; // fall back to stored data if enrichment fails
    }
  }
  return { stored, profile };
}

// "PRICE_LEVEL_MODERATE" -> "$$"
export function priceLabel(priceLevel: string | null): string | null {
  switch (priceLevel) {
    case "PRICE_LEVEL_FREE":
      return "Free";
    case "PRICE_LEVEL_INEXPENSIVE":
      return "$";
    case "PRICE_LEVEL_MODERATE":
      return "$$";
    case "PRICE_LEVEL_EXPENSIVE":
      return "$$$";
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return "$$$$";
    default:
      return null;
  }
}

// "italian_restaurant" -> "Italian Restaurant"; drops generic catch-all types.
export function formatTypes(types: string[]): string[] {
  const generic = new Set(["point_of_interest", "establishment", "food", "store"]);
  return types
    .filter((t) => !generic.has(t))
    .slice(0, 3)
    .map((t) => t.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
}
