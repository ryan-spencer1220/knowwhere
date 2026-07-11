import { Ionicons } from "@expo/vector-icons";
import { useState, type ReactElement, type ReactNode } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";

import { FLOATING_TAB_BAR_SPACE } from "@/lib/layout";
import { useTheme, useThemedStyles, type Palette } from "@/lib/theme";

/**
 * KnowWhere UI kit — the shared building blocks for the Starface-inspired
 * look (mint base, chunky white cards with hard offset shadows, bold type,
 * violet accents, star motifs). Use these so every screen stays consistent.
 */

// Subtle dot-grid texture that sits behind a screen's content.
export function Texture() {
  const Star = useTheme();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="kwDots" width={22} height={22} patternUnits="userSpaceOnUse">
            <Circle cx={2} cy={2} r={1.6} fill={Star.ink} fillOpacity={0.07} />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#kwDots)" />
      </Svg>
    </View>
  );
}

// Full-screen shell: mint background, star field, safe area, optional scroll.
export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.screenRoot}>
      <Texture />
      <SafeAreaView style={styles.flex} edges={["top"]}>
        {scroll ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={styles.staticContent}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

// Virtualized sibling of Screen for the long, growable lists (feed, explore,
// profile). Renders a FlatList over the same mint/texture/safe-area shell and
// reuses Screen's content padding + 16px gap, so the layout is identical to a
// ScrollView of the same children — only now rows are windowed. `header`,
// `footer`, and `empty` map to FlatList's header/footer/empty slots.
export function ListScreen<T>({
  data,
  renderItem,
  keyExtractor,
  header,
  footer,
  empty,
}: {
  data: readonly T[];
  renderItem: (item: T) => ReactElement | null;
  keyExtractor: (item: T) => string;
  header?: ReactNode;
  footer?: ReactNode;
  empty?: ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screenRoot}>
      <Texture />
      <SafeAreaView style={styles.flex} edges={["top"]}>
        <FlatList
          data={data}
          keyExtractor={keyExtractor}
          renderItem={({ item }) => renderItem(item)}
          ListHeaderComponent={header as ReactElement}
          ListFooterComponent={footer as ReactElement}
          ListEmptyComponent={empty as ReactElement}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + FLOATING_TAB_BAR_SPACE }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>
    </View>
  );
}

// Big bold screen title with optional subtitle.
export function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.heading}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

// Chunky white card with a hard black offset shadow. Pass `onPress` to make
// the whole card tappable. Pass `cover` to render a full-bleed image/banner
// flush to the top edge with the card's rounded corners.
export function Card({
  children,
  style,
  onPress,
  cover,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  cover?: ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  const inner = (
    <View style={[styles.card, !!cover && styles.cardClipped, style]}>
      {cover ? <View style={styles.coverSlot}>{cover}</View> : null}
      {children}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.cardShadow, pressed && styles.cardPressed]}>
        {inner}
      </Pressable>
    );
  }
  return <View style={styles.cardShadow}>{inner}</View>;
}

// Primary action button: black fill, violet bold label, tactile press.
export function Button({
  label,
  loading,
  style,
  ...props
}: Omit<PressableProps, "style"> & { label: string; loading?: boolean; style?: StyleProp<ViewStyle> }) {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      {...props}
      disabled={props.disabled || loading}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, style]}
    >
      {loading ? <ActivityIndicator color={Star.pop} /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );
}

// Standardized chunky icon button — a white square with a thick ink border and
// a hard offset shadow (the app's Card treatment, shrunk), that presses "down"
// into its shadow on tap. Use for every header/action control (back, settings,
// delete, rename, etc.) so they read as one consistent, tactile set. `tone`
// swaps the icon to the danger color for destructive actions.
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  tone = "default",
  loading = false,
  disabled = false,
  size = 42,
  iconSize,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  accessibilityLabel: string;
  tone?: "default" | "danger";
  loading?: boolean;
  disabled?: boolean;
  size?: number;
  iconSize?: number;
}) {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const color = tone === "danger" ? Star.danger : Star.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.iconBtnShadow}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.iconBtnFace,
            { width: size, height: size },
            pressed && styles.iconBtnFacePressed,
            disabled && styles.iconBtnDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={color} />
          ) : (
            <Ionicons name={icon} size={iconSize ?? Math.round(size * 0.52)} color={color} />
          )}
        </View>
      )}
    </Pressable>
  );
}

// Error card with the failure message and an optional "Try again" button.
// Pair with a query's `refetch` so a transient network failure is recoverable.
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Card style={styles.errorState}>
      <Text style={styles.errorStateText}>{message}</Text>
      {onRetry ? <Button label="Try again" onPress={onRetry} style={styles.errorStateBtn} /> : null}
    </Card>
  );
}

// Labeled text input with self-managed focus + optional left/right slots.
export function Field({
  label,
  leftSlot,
  rightSlot,
  style,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & { label?: string; leftSlot?: ReactNode; rightSlot?: ReactNode }) {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldGroup}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={[styles.field, focused && styles.fieldFocused]}>
        {leftSlot}
        <TextInput
          placeholderTextColor={Star.textMuted}
          style={[styles.fieldInput, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {rightSlot}
      </View>
    </View>
  );
}

// Small rounded chip — e.g. a location or category tag.
export function Pill({
  icon,
  label,
  tone = "default",
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: "default" | "accent";
}) {
  const Star = useTheme();
  const styles = useThemedStyles(makeStyles);
  const accent = tone === "accent";
  return (
    <View style={[styles.pill, accent && styles.pillAccent]}>
      {icon ? <Ionicons name={icon} size={12} color={accent ? Star.surface : Star.ink} /> : null}
      <Text style={[styles.pillText, accent && styles.pillTextAccent]}>{label}</Text>
    </View>
  );
}

const makeStyles = (Star: Palette) => StyleSheet.create({
  flex: { flex: 1 },
  screenRoot: {
    flex: 1,
    backgroundColor: Star.base,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 36,
    gap: 16,
  },
  staticContent: {
    flex: 1,
    padding: 20,
  },
  heading: {
    gap: 4,
    marginBottom: 2,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: Star.ink,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Star.ink,
    opacity: 0.65,
  },
  cardShadow: {
    borderRadius: 22,
    backgroundColor: Star.ink,
  },
  cardPressed: {
    transform: [{ translateX: -2 }, { translateY: -2 }],
  },
  card: {
    backgroundColor: Star.surface,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: Star.ink,
    padding: 16,
    gap: 8,
    transform: [{ translateX: -4 }, { translateY: -5 }],
  },
  // Clip children to the rounded corners so a full-bleed cover image is masked.
  cardClipped: { overflow: "hidden" },
  // Cancel the card padding so the cover reaches all the way to the edges,
  // with a chunky ink divider below it.
  coverSlot: {
    marginTop: -16,
    marginHorizontal: -16,
    marginBottom: 4,
    borderBottomWidth: 2.5,
    borderBottomColor: Star.ink,
  },
  button: {
    backgroundColor: Star.ink,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    transform: [{ translateY: 2 }],
    opacity: 0.95,
  },
  buttonText: {
    color: Star.pop,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  // Icon button: ink shadow slab under a white face that's offset up-left; on
  // press the face drops onto the slab for a tactile "click".
  iconBtnShadow: { borderRadius: 13, backgroundColor: Star.ink, alignSelf: "flex-start" },
  iconBtnFace: {
    borderRadius: 12,
    backgroundColor: Star.surface,
    borderWidth: 2.5,
    borderColor: Star.ink,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateX: -2 }, { translateY: -3 }],
  },
  iconBtnFacePressed: { transform: [{ translateX: 0 }, { translateY: 0 }] },
  iconBtnDisabled: { opacity: 0.5 },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    color: Star.ink,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Star.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: Star.ink,
  },
  fieldFocused: {
    borderColor: Star.pop,
    backgroundColor: Star.blush,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: Star.text,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: Star.base,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Star.ink,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  errorState: { alignItems: "center", gap: 12, paddingVertical: 24 },
  errorStateText: { fontSize: 14, fontWeight: "600", color: Star.danger, textAlign: "center" },
  errorStateBtn: { alignSelf: "stretch", paddingHorizontal: 28 },
  pillAccent: { backgroundColor: Star.pop },
  pillText: {
    fontSize: 12,
    fontWeight: "800",
    color: Star.ink,
  },
  pillTextAccent: { color: Star.surface },
});
