import { getBlockedIds } from "@/lib/moderation";
import { supabase } from "@/lib/supabase";

export const NEARBY_RADIUS_KM = 40;

export type NearbyPlace = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  listTitle: string | null;
  ownerId: string | null;
  ownerName: string | null;
  ownerUsername: string | null;
  distanceKm: number;
};

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

type RawNearbyRow = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  list:
    | { title: string | null; owner: RawOwner | RawOwner[] | null }
    | { title: string | null; owner: RawOwner | RawOwner[] | null }[]
    | null;
};

type RawOwner = { id: string; username: string | null; display_name: string | null };

// Places near a point, from the user's own lists + the people they follow.
export async function getNearbyPlaces(
  userId: string,
  lat: number,
  lng: number,
  radiusKm: number = NEARBY_RADIUS_KM,
): Promise<NearbyPlace[]> {
  // 1. Owners whose lists we surface: self + everyone followed.
  const { data: follows, error: followErr } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);
  if (followErr) throw followErr;
  const blocked = new Set(await getBlockedIds(userId));
  const ownerIds = [userId, ...(follows ?? []).map((f) => f.following_id).filter((id) => !blocked.has(id))];

  // 2. Their lists (RLS keeps followed users' private lists out).
  const { data: lists, error: listErr } = await supabase.from("lists").select("id").in("owner_id", ownerIds);
  if (listErr) throw listErr;
  const listIds = (lists ?? []).map((l) => l.id);
  if (listIds.length === 0) return [];

  // 3. Their places within a bounding box around the point.
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
  const { data, error } = await supabase
    .from("list_places")
    .select("id, name, address, latitude, longitude, list:lists!inner(title, owner:profiles!owner_id(id, username, display_name))")
    .in("list_id", listIds)
    .gte("latitude", lat - latDelta)
    .lte("latitude", lat + latDelta)
    .gte("longitude", lng - lngDelta)
    .lte("longitude", lng + lngDelta);
  if (error) throw error;

  return ((data ?? []) as unknown as RawNearbyRow[])
    .filter((r) => r.latitude != null && r.longitude != null)
    .map((r) => {
      const list = Array.isArray(r.list) ? r.list[0] : r.list;
      const owner = list ? (Array.isArray(list.owner) ? list.owner[0] : list.owner) : null;
      return {
        id: r.id,
        name: r.name,
        address: r.address,
        latitude: r.latitude as number,
        longitude: r.longitude as number,
        listTitle: list?.title ?? null,
        ownerId: owner?.id ?? null,
        ownerName: owner?.display_name ?? null,
        ownerUsername: owner?.username ?? null,
        distanceKm: haversineKm(lat, lng, r.latitude as number, r.longitude as number),
      };
    })
    .filter((p) => p.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 50);
}

export function milesLabel(km: number): string {
  const mi = km * 0.621371;
  if (mi < 0.1) return "here";
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
}
