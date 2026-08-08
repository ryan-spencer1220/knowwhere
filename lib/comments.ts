import { getBlockedIds } from "@/lib/moderation";
import { supabase } from "@/lib/supabase";

export type ListComment = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
};

const COMMENT_SELECT =
  "id, body, created_at, author_id, author:profiles!author_id(display_name, username, avatar_url)";

type RawAuthor = { display_name: string | null; username: string | null; avatar_url: string | null };
type RawCommentRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author: RawAuthor | RawAuthor[] | null;
};

function mapComment(raw: RawCommentRow): ListComment {
  const author = Array.isArray(raw.author) ? raw.author[0] : raw.author;
  return {
    id: raw.id,
    body: raw.body,
    createdAt: raw.created_at,
    authorId: raw.author_id,
    authorName: author?.display_name ?? null,
    authorUsername: author?.username ?? null,
    authorAvatarUrl: author?.avatar_url ?? null,
  };
}

// Comments on a list, oldest first (natural reading order for a thread).
// Comments from people the viewer has blocked are filtered out client-side,
// mirroring how the discovery surfaces hide blocked users.
export async function getListComments(listId: string, currentUserId: string | null = null): Promise<ListComment[]> {
  const { data, error } = await supabase
    .from("list_comments")
    .select(COMMENT_SELECT)
    .eq("list_id", listId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const blocked = new Set(await getBlockedIds(currentUserId));
  return ((data ?? []) as unknown as RawCommentRow[])
    .filter((raw) => !blocked.has(raw.author_id))
    .map(mapComment);
}

// Post a comment as the signed-in user. RLS enforces that the author is the
// caller and that they can see the list. Returns the created comment.
export async function addComment(listId: string, authorId: string, body: string): Promise<ListComment> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Comment can't be empty.");
  const { data, error } = await supabase
    .from("list_comments")
    .insert({ list_id: listId, author_id: authorId, body: trimmed })
    .select(COMMENT_SELECT)
    .single();
  if (error) throw error;
  return mapComment(data as unknown as RawCommentRow);
}

// Delete a comment. RLS restricts this to the comment's author or the list owner.
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from("list_comments").delete().eq("id", commentId);
  if (error) throw error;
}
