import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { useAuth } from "@/lib/auth";
import { useThemedStyles, type Palette } from "@/lib/theme";
import { followUser, unfollowUser } from "@/lib/users";

export function FollowButton({
  targetId,
  following,
  onChange,
}: {
  targetId: string;
  following: boolean;
  onChange?: (following: boolean) => void;
}) {
  const { session } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const [isFollowing, setIsFollowing] = useState(following);
  const [busy, setBusy] = useState(false);

  useEffect(() => setIsFollowing(following), [following]);

  const toggle = async () => {
    if (!session || busy) return;
    const next = !isFollowing;
    setBusy(true);
    setIsFollowing(next); // optimistic
    try {
      if (next) await followUser(session.user.id, targetId);
      else await unfollowUser(session.user.id, targetId);
      onChange?.(next);
    } catch {
      setIsFollowing(!next); // revert on failure
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={toggle}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ selected: isFollowing }}
      accessibilityLabel={isFollowing ? "Unfollow" : "Follow"}
      style={({ pressed }) => [styles.btn, isFollowing && styles.btnFollowing, pressed && styles.pressed]}
    >
      <Text style={[styles.text, isFollowing && styles.textFollowing]}>{isFollowing ? "Following" : "Follow"}</Text>
    </Pressable>
  );
}

const makeStyles = (Star: Palette) => StyleSheet.create({
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Star.ink,
    backgroundColor: Star.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  btnFollowing: {
    backgroundColor: Star.surface,
  },
  pressed: { transform: [{ translateY: 1 }], opacity: 0.95 },
  text: {
    fontSize: 14,
    fontWeight: "800",
    color: Star.pop,
  },
  textFollowing: {
    color: Star.ink,
  },
});
