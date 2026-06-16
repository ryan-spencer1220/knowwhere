import { timeAgo } from "@/lib/lists";

describe("timeAgo", () => {
  const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

  it("says 'just now' under a minute", () => {
    expect(timeAgo(minutesAgo(0))).toBe("just now");
  });

  it("counts minutes, hours, days, and weeks", () => {
    expect(timeAgo(minutesAgo(5))).toBe("5m ago");
    expect(timeAgo(minutesAgo(60 * 3))).toBe("3h ago");
    expect(timeAgo(minutesAgo(60 * 24 * 2))).toBe("2d ago");
    expect(timeAgo(minutesAgo(60 * 24 * 7 * 2))).toBe("2w ago");
  });

  it("falls back to a date string past a month", () => {
    const result = timeAgo(minutesAgo(60 * 24 * 90));
    expect(result).not.toMatch(/ago|just now/);
  });
});
