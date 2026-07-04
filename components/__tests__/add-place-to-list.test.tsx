import { fireEvent, render, screen } from "@testing-library/react-native";

import { AddPlaceToList } from "@/components/add-place-to-list";

jest.mock("@/lib/places-search", () => ({
  fetchPredictions: jest.fn().mockResolvedValue([]),
  fetchDetails: jest.fn(),
}));

describe("AddPlaceToList", () => {
  it("expands from the button into a search field", () => {
    render(<AddPlaceToList listId="l1" existingGoogleIds={[]} nextPosition={0} onAdded={() => {}} />);
    expect(screen.getByText("Add a place")).toBeTruthy();

    fireEvent.press(screen.getByText("Add a place"));
    expect(screen.getByPlaceholderText("Search for a place")).toBeTruthy();
  });
});
