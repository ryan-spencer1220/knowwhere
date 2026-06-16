import type { Profile } from "@/lib/database.types";
import { getBlockedIds } from "@/lib/moderation";
import { supabase } from "@/lib/supabase";

export type ListCard = {
  id: string;
  title: string;
  city: string | null;
  location: string | null;
  createdAt: string;
  isPublic: boolean;
  coverImageUrl: string | null;
  ownerUsername: string | null;
  ownerName: string | null;
  placesCount: number;
  savesCount: number;
};

// A list row with its owner profile, place count, and maintained save count.
const LIST_SELECT =
  "id, title, city, location, created_at, is_public, cover_image_url, saves_count, owner_id, owner:profiles!owner_id(username, display_name), list_places(count)";

type RawListRow = {
  id: string;
  title: string;
  city: string | null;
  location: string | null;
  created_at: string;
  is_public: boolean | null;
  cover_image_url: string | null;
  saves_count: number | null;
  owner_id: string;
  owner:
    | { username: string | null; display_name: string | null }
    | { username: string | null; display_name: string | null }[]
    | null;
  list_places: { count: number }[] | null;
};

function mapListCard(raw: RawListRow): ListCard {
  const owner = Array.isArray(raw.owner) ? raw.owner[0] : raw.owner;
  return {
    id: raw.id,
    title: raw.title,
    city: raw.city,
    location: raw.location,
    createdAt: raw.created_at,
    isPublic: raw.is_public ?? true,
    coverImageUrl: raw.cover_image_url ?? null,
    ownerUsername: owner?.username ?? null,
    ownerName: owner?.display_name ?? null,
    placesCount: raw.list_places?.[0]?.count ?? 0,
    savesCount: raw.saves_count ?? 0,
  };
}

// Lists owned by the current user, newest first.
export async function getMyLists(userId: string): Promise<ListCard[]> {
  const { data, error } = await supabase
    .from("lists")
    .select(LIST_SELECT)
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as RawListRow[]).map(mapListCard);
}

// Lists from people the current user follows, newest first.
export async function getFeedLists(userId: string): Promise<ListCard[]> {
  const { data: follows, error: followErr } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);
  if (followErr) throw followErr;

  const blocked = new Set(await getBlockedIds(userId));
  const ids = (follows ?? []).map((f) => f.following_id).filter((id) => !blocked.has(id));
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("lists")
    .select(LIST_SELECT)
    .in("owner_id", ids)
    .eq("is_public", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as RawListRow[]).map(mapListCard);
}

// Public lists, ranked by saves then place count (Explore / trending).
export async function getTrendingLists(currentUserId: string | null = null): Promise<ListCard[]> {
  const blocked = new Set(await getBlockedIds(currentUserId));
  const { data, error } = await supabase
    .from("lists")
    .select(LIST_SELECT)
    .eq("is_public", true)
    .order("saves_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return ((data ?? []) as unknown as RawListRow[])
    .filter((raw) => !blocked.has(raw.owner_id))
    .map(mapListCard)
    .sort((a, b) => b.savesCount - a.savesCount || b.placesCount - a.placesCount);
}

export type ProfileScreenData = {
  profile: Profile;
  lists: ListCard[];
  followers: number;
  following: number;
};

export async function getProfileScreen(userId: string): Promise<ProfileScreenData> {
  const [profileRes, lists, followersRes, followingRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    getMyLists(userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  if (profileRes.error) throw profileRes.error;
  return {
    profile: profileRes.data,
    lists,
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
  };
}

export type PlaceItem = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  position: number;
};

export type ListDetail = {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  location: string | null;
  createdAt: string;
  ownerId: string | null;
  ownerUsername: string | null;
  ownerName: string | null;
  isPublic: boolean;
  savesCount: number;
  likedByMe: boolean;
  places: PlaceItem[];
};

type DetailOwner = { id: string; username: string | null; display_name: string | null };
type RawDetailRow = {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  location: string | null;
  created_at: string;
  is_public: boolean | null;
  saves_count: number | null;
  owner: DetailOwner | DetailOwner[] | null;
  list_places: PlaceItem[] | null;
};

export async function getListDetail(id: string, currentUserId: string | null = null): Promise<ListDetail> {
  const { data, error } = await supabase
    .from("lists")
    .select(
      "id, title, description, city, location, created_at, is_public, saves_count, owner:profiles!owner_id(id, username, display_name), list_places(id, name, address, latitude, longitude, note, position)",
    )
    .eq("id", id)
    .single();
  if (error) throw error;

  let likedByMe = false;
  if (currentUserId) {
    const { count } = await supabase
      .from("list_saves")
      .select("*", { count: "exact", head: true })
      .eq("user_id", currentUserId)
      .eq("list_id", id);
    likedByMe = (count ?? 0) > 0;
  }

  const raw = data as unknown as RawDetailRow;
  const owner = Array.isArray(raw.owner) ? raw.owner[0] : raw.owner;
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    city: raw.city,
    location: raw.location,
    createdAt: raw.created_at,
    ownerId: owner?.id ?? null,
    ownerUsername: owner?.username ?? null,
    ownerName: owner?.display_name ?? null,
    isPublic: raw.is_public ?? true,
    savesCount: raw.saves_count ?? 0,
    likedByMe,
    places: (raw.list_places ?? []).slice().sort((a, b) => a.position - b.position),
  };
}

export type ProfileEdits = {
  display_name?: string | null;
  bio?: string | null;
  city?: string | null;
};

// Update the signed-in user's editable profile fields.
export async function updateMyProfile(userId: string, edits: ProfileEdits): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ ...edits, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

export async function setListVisibility(listId: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase.from("lists").update({ is_public: isPublic }).eq("id", listId);
  if (error) throw error;
}

// Delete a list (and its places/saves via ON DELETE CASCADE). RLS restricts
// this to the list's owner.
export async function deleteList(listId: string): Promise<void> {
  const { error } = await supabase.from("lists").delete().eq("id", listId);
  if (error) throw error;
}

export async function likeList(userId: string, listId: string): Promise<void> {
  const { error } = await supabase.from("list_saves").insert({ user_id: userId, list_id: listId });
  if (error) throw error;
}

export async function unlikeList(userId: string, listId: string): Promise<void> {
  const { error } = await supabase.from("list_saves").delete().eq("user_id", userId).eq("list_id", listId);
  if (error) throw error;
}

// "2h ago" style relative time for list cards.
export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString();
}
