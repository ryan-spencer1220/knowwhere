import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";

export type Spot = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  // A user-dropped map pin with no backing Google Place. `id` is a local-only
  // key; the row is stored with a null google_place_id.
  custom?: boolean;
};

export type Prediction = { placeId: string; primary: string; secondary: string };

export type Coords = { latitude: number; longitude: number };

// Real Places runs through the "places" Supabase Edge Function (server-side
// key). Web stays on mock data for the offline UI preview.
const USE_REAL_PLACES = Platform.OS !== "web";

const MOCK_SPOTS: Spot[] = [
  { id: "1", name: "Blue Bottle Coffee", address: "66 Mint St, San Francisco", latitude: 37.7825, longitude: -122.4089 },
  { id: "2", name: "Tartine Bakery", address: "600 Guerrero St, San Francisco", latitude: 37.7614, longitude: -122.4241 },
  { id: "3", name: "Dolores Park", address: "Dolores St, San Francisco", latitude: 37.7596, longitude: -122.4269 },
  { id: "4", name: "Ferry Building Marketplace", address: "1 Ferry Building, San Francisco", latitude: 37.7955, longitude: -122.3937 },
  { id: "5", name: "Zuni Café", address: "1658 Market St, San Francisco", latitude: 37.7727, longitude: -122.4218 },
  { id: "6", name: "Golden Gate Park", address: "San Francisco", latitude: 37.7694, longitude: -122.4862 },
];

function mockPredictions(query: string): Prediction[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return MOCK_SPOTS.filter((s) => s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q))
    .slice(0, 5)
    .map((s) => ({ placeId: s.id, primary: s.name, secondary: s.address }));
}

export async function fetchPredictions(query: string, coords?: Coords | null): Promise<Prediction[]> {
  if (!USE_REAL_PLACES) return mockPredictions(query);
  const body: Record<string, unknown> = { type: "autocomplete", input: query };
  if (coords) {
    body.latitude = coords.latitude;
    body.longitude = coords.longitude;
  }
  const { data, error } = await supabase.functions.invoke("places", { body });
  if (error) throw error;
  return (data?.predictions ?? []) as Prediction[];
}

// Resolve a Google place_id from a free-text query (name/address), optionally
// biased toward a location. Used to match imported places back to real Places.
export async function resolvePlaceId(query: string, coords?: Coords | null): Promise<string | null> {
  const q = query.trim();
  if (!q) return null;
  if (!USE_REAL_PLACES) {
    const m = MOCK_SPOTS.find((s) => `${s.name} ${s.address}`.toLowerCase().includes(q.toLowerCase()));
    return m?.id ?? null;
  }
  const body: Record<string, unknown> = { type: "search", query: q };
  if (coords) {
    body.latitude = coords.latitude;
    body.longitude = coords.longitude;
  }
  const { data, error } = await supabase.functions.invoke("places", { body });
  if (error) throw error;
  return (data?.placeId ?? null) as string | null;
}

export async function fetchDetails(placeId: string): Promise<Spot | null> {
  if (!USE_REAL_PLACES) return MOCK_SPOTS.find((s) => s.id === placeId) ?? null;
  const { data, error } = await supabase.functions.invoke("places", {
    body: { type: "details", placeId },
  });
  if (error) throw error;
  return (data?.place ?? null) as Spot | null;
}

// Best-effort hero photo for a list cover (a place's Google photo).
export async function fetchCoverPhoto(placeId: string): Promise<string | null> {
  if (!USE_REAL_PLACES) return null;
  try {
    const { data } = await supabase.functions.invoke("places", { body: { type: "place", placeId } });
    return (data?.place?.photoUri ?? null) as string | null;
  } catch {
    return null;
  }
}
