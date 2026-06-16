import { render, screen } from "@testing-library/react-native";

import { Avatar, initialsFrom } from "@/components/avatar";

describe("initialsFrom", () => {
  it("uses the first letters of two-word names", () => {
    expect(initialsFrom("Maya Chen", "maya")).toBe("MC");
  });

  it("falls back to the username, then to '?'", () => {
    expect(initialsFrom(null, "sasha")).toBe("SA");
    expect(initialsFrom(null, null)).toBe("?");
  });
});

describe("Avatar", () => {
  it("renders initials when there is no photo url", () => {
    render(<Avatar url={null} initials="MC" />);
    expect(screen.getByText("MC")).toBeTruthy();
  });
});
