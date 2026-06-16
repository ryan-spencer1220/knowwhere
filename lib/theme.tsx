import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// The palette shape every screen styles against. Structural tokens
// (ink/surface/text/textMuted/border/danger) stay constant across themes — only
// the brand colors (base/pop/popDeep/blush) change, so the bold Starface look is
// identical and just the colors swap.
export type Palette = {
  base: string; // screen background
  pop: string; // accent (CTA text, pills, focus)
  popDeep: string; // pressed/active accent
  blush: string; // soft accent tint (focused field, note cards)
  ink: string; // black type + borders
  text: string;
  textMuted: string;
  surface: string; // cards
  border: string;
  danger: string;
};

const INK = "#141210";
const MUTED = "#6E6A60";
const SURFACE = "#FFFFFF";
const DANGER = "#D7263D";

const constants = { ink: INK, text: INK, textMuted: MUTED, surface: SURFACE, border: INK, danger: DANGER };

export type ThemeDef = { key: string; name: string; palette: Palette };

export const THEMES: ThemeDef[] = [
  { key: "mint", name: "Mint", palette: { base: "#3FD9A8", pop: "#8B5CF6", popDeep: "#7A45E8", blush: "#ECE4FF", ...constants } },
  { key: "butter", name: "Butter", palette: { base: "#FFD23F", pop: "#7C3AED", popDeep: "#6D28D9", blush: "#EDE4FF", ...constants } },
  { key: "tangerine", name: "Tangerine", palette: { base: "#FF9F45", pop: "#4F46E5", popDeep: "#4338CA", blush: "#E5E7FF", ...constants } },
  { key: "sky", name: "Sky", palette: { base: "#5BC0EB", pop: "#FF5A3C", popDeep: "#E8492C", blush: "#FFE4DD", ...constants } },
  { key: "grape", name: "Grape", palette: { base: "#A98BFF", pop: "#16A34A", popDeep: "#15803D", blush: "#DCFCE7", ...constants } },
  { key: "punch", name: "Punch", palette: { base: "#FF7A8A", pop: "#1F6FEB", popDeep: "#1A5FD0", blush: "#DCEAFF", ...constants } },
];

const DEFAULT = THEMES[0];
const STORAGE_KEY = "knowwhere.theme";

type ThemeContextValue = { palette: Palette; themeKey: string; setTheme: (key: string) => void };

const ThemeContext = createContext<ThemeContextValue>({
  palette: DEFAULT.palette,
  themeKey: DEFAULT.key,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeKey, setThemeKey] = useState(DEFAULT.key);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && THEMES.some((t) => t.key === saved)) setThemeKey(saved);
    });
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const palette = THEMES.find((t) => t.key === themeKey)?.palette ?? DEFAULT.palette;
    return {
      palette,
      themeKey,
      setTheme: (key: string) => {
        setThemeKey(key);
        AsyncStorage.setItem(STORAGE_KEY, key).catch(() => {});
      },
    };
  }, [themeKey]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// The active palette. Components shadow their `Star` import with this so all
// existing `Star.x` references pick up the live theme.
export function useTheme(): Palette {
  return useContext(ThemeContext).palette;
}

// Theme selection controls for the settings screen.
export function useThemeControls() {
  const ctx = useContext(ThemeContext);
  return { themeKey: ctx.themeKey, setTheme: ctx.setTheme, themes: THEMES };
}

// Build a StyleSheet from the active palette, memoized per theme.
export function useThemedStyles<T>(factory: (t: Palette) => T): T {
  const palette = useTheme();
  return useMemo(() => factory(palette), [palette, factory]);
}
