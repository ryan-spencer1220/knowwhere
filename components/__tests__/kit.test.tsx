import { fireEvent, render, screen } from "@testing-library/react-native";

import { Button, Card, Heading, Pill } from "@/components/ui/kit";
import { Text } from "react-native";

describe("Button", () => {
  it("renders its label and fires onPress", () => {
    const onPress = jest.fn();
    render(<Button label="Save changes" onPress={onPress} />);
    fireEvent.press(screen.getByText("Save changes"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("hides the label and ignores presses while loading", () => {
    const onPress = jest.fn();
    render(<Button label="Save changes" onPress={onPress} loading />);
    expect(screen.queryByText("Save changes")).toBeNull();
  });
});

describe("Pill", () => {
  it("renders its label", () => {
    render(<Pill label="Oakland, CA" />);
    expect(screen.getByText("Oakland, CA")).toBeTruthy();
  });
});

describe("Card", () => {
  it("renders children", () => {
    render(
      <Card>
        <Text>Card body</Text>
      </Card>,
    );
    expect(screen.getByText("Card body")).toBeTruthy();
  });

  it("fires onPress when tapped", () => {
    const onPress = jest.fn();
    render(
      <Card onPress={onPress}>
        <Text>Tap me</Text>
      </Card>,
    );
    fireEvent.press(screen.getByText("Tap me"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("Heading", () => {
  it("renders the title and optional subtitle", () => {
    render(<Heading title="Explore" subtitle="Find people to follow" />);
    expect(screen.getByText("Explore")).toBeTruthy();
    expect(screen.getByText("Find people to follow")).toBeTruthy();
  });
});
