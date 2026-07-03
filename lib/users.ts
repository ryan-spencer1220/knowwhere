import type { Profile } from "@/lib/database.types";
import { getMyLists, type ListCard } from "@/lib/lists";
import { getBlockedIds } from "@/lib/moderation";
import { supabase } from "@/lib/supabase";

export type UserCard = {
  id: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  city: string | null;
};

// People the current user could follow (excludes self + already-followed).
export async function getSuggestedUsers(currentUserId: string): Promise<UserCard[]> {
  const [profilesRes, followingRes] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, bio, city").neq("id", currentUserId).limit(20),
    supabase.from("follows").select("following_id").eq("follower_id", currentUserId),
  ]);
  if (profilesRes.error) throw profilesRes.error;

  const followingIds = new Set((followingRes.data ?? []).map((f) => f.following_id));
  return (profilesRes.data ?? [])
    .filter((p) => !followingIds.has(p.id))
    .slice(0, 10)
    .map((p) => ({ id: p.id, username: p.username, displayName: p.display_name, bio: p.bio, city: p.city }));
}

export type ExploreUser = UserCard & { avatarUrl: string | null; isFollowing: boolean };

// Everyone to discover on Explore (excludes self), with avatar + follow state.
export async function getExploreUsers(currentUserId: string | null): Promise<ExploreUser[]> {
  const [profilesRes, followingRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, bio, city, avatar_url")
      .neq("id", currentUserId ?? "")
      .limit(50),
    currentUserId
      ? supabase.from("follows").select("following_id").eq("follower_id", currentUserId)
      : Promise.resolve({ data: [] as { following_id: string }[], error: null }),
  ]);
  if (profilesRes.error) throw profilesRes.error;

  const followingIds = new Set((followingRes.data ?? []).map((f) => f.following_id));
  const blocked = new Set(await getBlockedIds(currentUserId));
  return (profilesRes.data ?? [])
    .filter((p) => !blocked.has(p.id))
    .map((p) => ({
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      bio: p.bio,
      city: p.city,
      avatarUrl: p.avatar_url,
      isFollowing: followingIds.has(p.id),
    }));
}

export type UserProfileData = {
  profile: Profile;
  lists: ListCard[];
  followers: number;
  following: number;
  isFollowing: boolean;
  isSelf: boolean;
};

export async function getUserProfile(userId: string, currentUserId: string | null): Promise<UserProfileData> {
  const [profileRes, lists, followersRes, followingRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    getMyLists(userId), // RLS returns only public lists when it isn't your own profile
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  if (profileRes.error) throw profileRes.error;

  let isFollowing = false;
  if (currentUserId && currentUserId !== userId) {
    const { count } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", currentUserId)
      .eq("following_id", userId);
    isFollowing = (count ?? 0) > 0;
  }

  return {
    profile: profileRes.data,
    lists,
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
    isFollowing,
    isSelf: currentUserId === userId,
  };
}

// Shared loader for the connections screen: resolves a set of follow rows into
// full user cards (avatar + follow state for the viewer), minus blocked users.
async function usersFromFollows(
  pick: "follower_id" | "following_id",
  match: "follower_id" | "following_id",
  userId: string,
  currentUserId: string | null,
): Promise<ExploreUser[]> {
  const { data: rows, error } = await supabase.from("follows").select(pick).eq(match, userId);
  if (error) throw error;
  const ids = (rows ?? []).map((r) => (r as Record<string, string>)[pick]);
  if (ids.length === 0) return [];

  const [profilesRes, followingRes] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, bio, city, avatar_url").in("id", ids),
    currentUserId
      ? supabase.from("follows").select("following_id").eq("follower_id", currentUserId)
      : Promise.resolve({ data: [] as { following_id: string }[], error: null }),
  ]);
  if (profilesRes.error) throw profilesRes.error;

  const followingIds = new Set((followingRes.data ?? []).map((f) => f.following_id));
  const blocked = new Set(await getBlockedIds(currentUserId));
  return (profilesRes.data ?? [])
    .filter((p) => !blocked.has(p.id))
    .map((p) => ({
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      bio: p.bio,
      city: p.city,
      avatarUrl: p.avatar_url,
      isFollowing: followingIds.has(p.id),
    }));
}

// Users who follow `userId` (rows where following_id = userId).
export function getFollowers(userId: string, currentUserId: string | null): Promise<ExploreUser[]> {
  return usersFromFollows("follower_id", "following_id", userId, currentUserId);
}

// Users `userId` follows (rows where follower_id = userId).
export function getFollowing(userId: string, currentUserId: string | null): Promise<ExploreUser[]> {
  return usersFromFollows("following_id", "follower_id", userId, currentUserId);
}

export async function followUser(currentUserId: string, targetId: string): Promise<void> {
  const { error } = await supabase.from("follows").insert({ follower_id: currentUserId, following_id: targetId });
  if (error) throw error;
}

export async function unfollowUser(currentUserId: string, targetId: string): Promise<void> {
  const { error } = await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", targetId);
  if (error) throw error;
}
