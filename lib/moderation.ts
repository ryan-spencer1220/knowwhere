import { supabase } from "@/lib/supabase";

export type ReportTargetType = "list" | "user" | "place";

export const REPORT_REASONS = ["Spam", "Harassment", "Inappropriate", "Other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

// File a report. The privileged write + moderator notification happen in the
// "submit-report" Edge Function (the reports table is write-only via RLS).
export async function reportContent(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason | string;
  details?: string;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke("submit-report", { body: input });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

export async function blockUser(blockedId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const blockerId = auth.user?.id;
  if (!blockerId) throw new Error("You need to be signed in.");
  const { error } = await supabase.from("blocks").insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockUser(blockedId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const blockerId = auth.user?.id;
  if (!blockerId) throw new Error("You need to be signed in.");
  const { error } = await supabase.from("blocks").delete().eq("blocker_id", blockerId).eq("blocked_id", blockedId);
  if (error) throw error;
}

export async function isBlocked(blockedId: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  const blockerId = auth.user?.id;
  if (!blockerId) return false;
  const { count } = await supabase
    .from("blocks")
    .select("*", { count: "exact", head: true })
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  return (count ?? 0) > 0;
}

// Ids the given user has blocked — used to filter discovery surfaces.
export async function getBlockedIds(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const { data, error } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", userId);
  if (error) return [];
  return (data ?? []).map((r) => r.blocked_id);
}
