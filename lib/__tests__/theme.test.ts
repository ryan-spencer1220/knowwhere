import { THEMES, type Palette } from "@/lib/theme";

const REQUIRED_KEYS: (keyof Palette)[] = [
  "base",
  "pop",
  "popDeep",
  "blush",
  "ink",
  "text",
  "textMuted",
  "surface",
  "border",
  "danger",
];

const HEX = /^#[0-9a-fA-F]{6}$/;

describe("THEMES", () => {
  it("ships at least one theme with Mint as the default first entry", () => {
    expect(THEMES.length).toBeGreaterThan(0);
    expect(THEMES[0].key).toBe("mint");
  });

  it("has unique keys", () => {
    const keys = THEMES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every palette has all tokens as valid 6-digit hex colors", () => {
    for (const theme of THEMES) {
      for (const key of REQUIRED_KEYS) {
        expect(theme.palette[key]).toMatch(HEX);
      }
    }
  });
});
