import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Avatar, initialsFrom } from "@/components/avatar";
import { useAuth } from "@/lib/auth";
import { addComment, deleteComment, getListComments, type ListComment } from "@/lib/comments";
import { toFriendlyMessage } from "@/lib/errors";
import { timeAgo } from "@/lib/lists";
import { blockUser, REPORT_REASONS, reportContent } from "@/lib/moderation";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";

const MAX_LENGTH = 2000;

/**
 * The comments thread on a list detail screen: a chronological list plus a
 * composer. Anyone who can see the list can comment; authors and the list owner
 * can delete, and any comment can be reported / its author blocked.
 *
 * `onCountChange` lets the parent keep its header count in sync without a full
 * refetch of the list.
 */
export function ListComments({
  listId,
  listOwnerId,
  onCountChange,
}: {
  listId: string;
  listOwnerId: string | null;
  onCountChange?: (count: number) => void;
}) {
  const { session } = useAuth();
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const me = session?.user.id ?? null;

  const [comments, setComments] = useState<ListComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getListComments(listId, me)
      .then((c) => {
        if (!active) return;
        setComments(c);
        setError(null);
      })
      .catch(() => active && setError("Couldn't load comments."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [listId, me]);

  const post = async () => {
    const body = draft.trim();
    if (!body || !me || posting) return;
    setPosting(true);
    try {
      const created = await addComment(listId, me, body);
      setDraft("");
      setComments((prev) => {
        const next = [...prev, created];
        onCountChange?.(next.length);
        return next;
      });
    } catch (e) {
      Alert.alert("Couldn't post", toFriendlyMessage(e));
    } finally {
      setPosting(false);
    }
  };

  const removeComment = (comment: ListComment) => {
    Alert.alert("Delete comment?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteComment(comment.id);
            setComments((prev) => {
              const next = prev.filter((c) => c.id !== comment.id);
              onCountChange?.(next.length);
              return next;
            });
          } catch (e) {
            Alert.alert("Couldn't delete", toFriendlyMessage(e));
          }
        },
      },
    ]);
  };

  const moderate = (comment: ListComment) => {
    const label = comment.authorName ?? (comment.authorUsername ? `@${comment.authorUsername}` : "this person");
    Alert.alert("Report comment", "Why are you reporting it?", [
      ...REPORT_REASONS.map((reason) => ({
        text: reason,
        onPress: async () => {
          try {
            await reportContent({ targetType: "comment", targetId: comment.id, reason });
            Alert.alert("Thanks", "Our team will take a look.");
          } catch (e) {
            Alert.alert("Couldn't report", toFriendlyMessage(e));
          }
        },
      })),
      {
        text: `Block ${label}`,
        style: "destructive" as const,
        onPress: async () => {
          try {
            await blockUser(comment.authorId);
            // Hide everything from that author right away.
            setComments((prev) => {
              const next = prev.filter((c) => c.authorId !== comment.authorId);
              onCountChange?.(next.length);
              return next;
            });
          } catch (e) {
            Alert.alert("Couldn't block", toFriendlyMessage(e));
          }
        },
      },
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>
        {comments.length > 0 ? `Comments (${comments.length})` : "Comments"}
      </Text>

      {loading ? (
        <ActivityIndicator color={Star.ink} style={styles.loader} />
      ) : error ? (
        <Text style={styles.muted}>{error}</Text>
      ) : comments.length === 0 ? (
        <Text style={styles.muted}>No comments yet. Be the first to say something.</Text>
      ) : (
        comments.map((c) => {
          const canDelete = me != null && (c.authorId === me || listOwnerId === me);
          const mine = c.authorId === me;
          return (
            <View key={c.id} style={styles.comment}>
              <Avatar url={c.authorAvatarUrl} initials={initialsFrom(c.authorName, c.authorUsername)} size={36} />
              <View style={styles.flex}>
                <View style={styles.metaRow}>
                  <Text style={styles.author} numberOfLines={1}>
                    {c.authorName ?? (c.authorUsername ? `@${c.authorUsername}` : "Someone")}
                  </Text>
                  <Text style={styles.time}>{timeAgo(c.createdAt)}</Text>
                </View>
                <Text style={styles.body}>{c.body}</Text>
              </View>
              {canDelete ? (
                <Pressable onPress={() => removeComment(c)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete comment">
                  <Ionicons name="trash-outline" size={16} color={Star.textMuted} />
                </Pressable>
              ) : mine ? null : (
                <Pressable onPress={() => moderate(c)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Report comment">
                  <Ionicons name="ellipsis-horizontal" size={18} color={Star.textMuted} />
                </Pressable>
              )}
            </View>
          );
        })
      )}

      {me ? (
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Add a comment…"
            placeholderTextColor={Star.textMuted}
            style={styles.input}
            multiline
            maxLength={MAX_LENGTH}
          />
          <Pressable
            onPress={post}
            disabled={!draft.trim() || posting}
            style={({ pressed }) => [styles.sendBtn, (!draft.trim() || posting) && styles.sendDisabled, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Post comment"
          >
            {posting ? (
              <ActivityIndicator size="small" color={Star.surface} />
            ) : (
              <Ionicons name="arrow-up" size={18} color={Star.surface} />
            )}
          </Pressable>
        </View>
      ) : (
        <Text style={styles.muted}>Sign in to join the conversation.</Text>
      )}
    </View>
  );
}

const makeStyles = (Star: Palette) =>
  StyleSheet.create({
    section: { gap: 12, marginTop: 4 },
    heading: { fontSize: 18, fontWeight: "900", color: Star.ink, letterSpacing: -0.3 },
    loader: { marginVertical: 8 },
    muted: { fontSize: 14, fontWeight: "500", color: Star.textMuted },
    flex: { flex: 1 },
    pressed: { opacity: 0.7 },
    comment: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    metaRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
    author: { flexShrink: 1, fontSize: 14, fontWeight: "800", color: Star.ink },
    time: { fontSize: 12, fontWeight: "600", color: Star.textMuted },
    body: { fontSize: 15, fontWeight: "500", color: Star.text, lineHeight: 21, marginTop: 2 },
    composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 4 },
    input: {
      flex: 1,
      fontSize: 15,
      fontWeight: "500",
      color: Star.text,
      backgroundColor: Star.surface,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: Star.ink,
      paddingHorizontal: 14,
      paddingVertical: 10,
      maxHeight: 120,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: Star.ink,
      backgroundColor: Star.pop,
      alignItems: "center",
      justifyContent: "center",
    },
    sendDisabled: { opacity: 0.5 },
  });
