import { render, screen } from "@testing-library/react-native";

import type { ListDetail } from "@/lib/lists";

// Imported after mocks so the screen picks them up.
import ListDetailScreen from "@/app/list/[id]";

// --- Mocks: routing, the focus-query data hook, auth, and the native map. ---
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "l1" }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock("@/lib/auth", () => ({ useAuth: () => ({ session: { user: { id: "viewer" } } }) }));

// Maps are native-only — stub the map component entirely.
jest.mock("@/components/list-map", () => ({ ListMap: () => null }));

// Comments fetch their own data; stub the section (covered by comments tests).
jest.mock("@/components/list-comments", () => ({ ListComments: () => null }));

const mockFixture: ListDetail = {
  id: "l1",
  title: "SF Favorites",
  description: "My go-to spots",
  city: "San Francisco",
  location: null,
  createdAt: new Date().toISOString(),
  ownerId: "owner1",
  ownerUsername: "sam",
  ownerName: "Sam",
  isPublic: true,
  savesCount: 3,
  commentsCount: 0,
  likedByMe: false,
  places: [
    { id: "p1", googlePlaceId: "g1", name: "Dolores Park", address: "Dolores St", latitude: 1, longitude: 2, note: null, position: 0 },
    { id: "p2", googlePlaceId: "g2", name: "Tartine", address: "600 Guerrero St", latitude: 3, longitude: 4, note: "Get the croissant", position: 1 },
  ],
};

jest.mock("@/lib/use-focus-query", () => ({
  useFocusQuery: () => ({ data: mockFixture, loading: false, error: null }),
}));

describe("List detail screen", () => {
  it("renders the list title, description, and its places", () => {
    render(<ListDetailScreen />);
    expect(screen.getAllByText("SF Favorites").length).toBeGreaterThan(0);
    expect(screen.getByText("My go-to spots")).toBeTruthy();
    expect(screen.getByText("Dolores Park")).toBeTruthy();
    expect(screen.getByText("Tartine")).toBeTruthy();
    expect(screen.getByText("2 places")).toBeTruthy();
  });

  it("offers a report action to non-owners (not a delete button)", () => {
    render(<ListDetailScreen />);
    expect(screen.getByLabelText("Report list")).toBeTruthy();
    expect(screen.queryByLabelText("Delete list")).toBeNull();
  });

  it("does not offer rename to non-owners", () => {
    render(<ListDetailScreen />);
    expect(screen.queryByLabelText(/^Rename list/)).toBeNull();
  });
});
