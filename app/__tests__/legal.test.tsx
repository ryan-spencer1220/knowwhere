import { render, screen } from "@testing-library/react-native";

import PrivacyScreen from "@/app/legal/privacy";

jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));

describe("Privacy Policy screen", () => {
  it("renders the policy title and a known section", () => {
    render(<PrivacyScreen />);
    // Title appears in the header and is referenced in the intro.
    expect(screen.getAllByText("Privacy Policy").length).toBeGreaterThan(0);
    expect(screen.getByText("Information you provide")).toBeTruthy();
    expect(screen.getByText("Data retention and deletion")).toBeTruthy();
  });
});
