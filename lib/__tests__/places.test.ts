import { formatTypes, priceLabel } from "@/lib/places";

describe("priceLabel", () => {
  it("maps Google price levels to dollar signs", () => {
    expect(priceLabel("PRICE_LEVEL_FREE")).toBe("Free");
    expect(priceLabel("PRICE_LEVEL_INEXPENSIVE")).toBe("$");
    expect(priceLabel("PRICE_LEVEL_MODERATE")).toBe("$$");
    expect(priceLabel("PRICE_LEVEL_EXPENSIVE")).toBe("$$$");
    expect(priceLabel("PRICE_LEVEL_VERY_EXPENSIVE")).toBe("$$$$");
  });

  it("returns null for unknown or missing levels", () => {
    expect(priceLabel(null)).toBeNull();
    expect(priceLabel("PRICE_LEVEL_UNSPECIFIED")).toBeNull();
  });
});

describe("formatTypes", () => {
  it("titleizes underscores and drops generic catch-all types", () => {
    expect(formatTypes(["italian_restaurant", "point_of_interest", "establishment"])).toEqual(["Italian Restaurant"]);
  });

  it("caps the result at three types", () => {
    expect(formatTypes(["cafe", "bakery", "bar", "park", "museum"])).toHaveLength(3);
  });

  it("returns an empty array when everything is generic", () => {
    expect(formatTypes(["food", "store", "establishment"])).toEqual([]);
  });
});
