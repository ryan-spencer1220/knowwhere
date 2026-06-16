import { milesLabel } from "@/lib/nearby";

describe("milesLabel", () => {
  it("shows 'here' for points basically on top of you", () => {
    expect(milesLabel(0)).toBe("here");
    expect(milesLabel(0.05)).toBe("here"); // ~0.03 mi
  });

  it("shows one decimal under ten miles", () => {
    expect(milesLabel(1.60934)).toBe("1.0 mi");
    expect(milesLabel(1)).toBe("0.6 mi");
  });

  it("rounds to whole miles at ten or more", () => {
    expect(milesLabel(80)).toBe("50 mi"); // 80 km ≈ 49.7 mi
  });
});
