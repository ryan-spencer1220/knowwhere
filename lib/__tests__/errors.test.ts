import { isNetworkError, toFriendlyMessage } from "@/lib/errors";

describe("toFriendlyMessage", () => {
  it("maps React Native's offline TypeError to a friendly, actionable line", () => {
    const err = new TypeError("Network request failed");
    expect(toFriendlyMessage(err)).toBe(
      "You appear to be offline. Check your connection and try again.",
    );
  });

  it("maps timeouts to a slow-connection message", () => {
    expect(toFriendlyMessage(new Error("The request timed out"))).toMatch(/took too long/i);
  });

  it("passes through human-readable auth/validation messages", () => {
    expect(toFriendlyMessage(new Error("Invalid login credentials"))).toBe(
      "Invalid login credentials",
    );
  });

  it("falls back to a generic message for unknown throwables", () => {
    expect(toFriendlyMessage(null)).toBe("Something went wrong. Please try again.");
    expect(toFriendlyMessage({})).toBe("Something went wrong. Please try again.");
  });
});

describe("isNetworkError", () => {
  it("is true for network failures and false otherwise", () => {
    expect(isNetworkError(new TypeError("Network request failed"))).toBe(true);
    expect(isNetworkError(new Error("Failed to fetch"))).toBe(true);
    expect(isNetworkError(new Error("Invalid login credentials"))).toBe(false);
  });
});
