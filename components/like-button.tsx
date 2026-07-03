import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { useAuth } from "@/lib/auth";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";
import { likeList, unlikeList } from "@/lib/lists";

export function LikeButton({ listId, liked, count }: { listId: string; liked: boolean; count: number }) {
  const { session } = useAuth();
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [isLiked, setIsLiked] = useState(liked);
  const [n, setN] = useState(count);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setIsLiked(liked);
    setN(count);
  }, [liked, count]);

  const toggle = async () => {
    if (!session || busy) return;
    const next = !isLiked;
    setBusy(true);
    setIsLiked(next);
    setN((c) => c + (next ? 1 : -1));
    try {
      if (next) await likeList(session.user.id, listId);
      else await unlikeList(session.user.id, listId);
    } catch {
      setIsLiked(!next);
      setN((c) => c + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={toggle}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ selected: isLiked }}
      accessibilityLabel={isLiked ? "Unlike list" : "Like list"}
      style={({ pressed }) => [styles.btn, isLiked && styles.btnLiked, pressed && styles.pressed]}
    >
      <Ionicons name={isLiked ? "heart" : "heart-outline"} size={18} color={isLiked ? Star.surface : Star.ink} />
      <Text style={[styles.count, isLiked && styles.countLiked]}>{n}</Text>
    </Pressable>
  );
}

const makeStyles = (Star: Palette) => StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Star.ink,
    backgroundColor: Star.surface,
  },
  btnLiked: { backgroundColor: Star.pop },
  pressed: { transform: [{ translateY: 1 }], opacity: 0.95 },
  count: { fontSize: 14, fontWeight: "800", color: Star.ink },
  countLiked: { color: Star.surface },
});
