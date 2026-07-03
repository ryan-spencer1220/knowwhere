import { fireEvent, render, screen } from "@testing-library/react-native";

import { Button, Card, Heading, ListScreen, Pill } from "@/components/ui/kit";
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

describe("ListScreen", () => {
  const renderRow = (item: { id: string; label: string }) => <Text>{item.label}</Text>;

  it("renders the header and a row per item", () => {
    render(
      <ListScreen
        data={[
          { id: "1", label: "First spot" },
          { id: "2", label: "Second spot" },
        ]}
        keyExtractor={(i) => i.id}
        header={<Text>My lists</Text>}
        renderItem={renderRow}
      />,
    );
    expect(screen.getByText("My lists")).toBeTruthy();
    expect(screen.getByText("First spot")).toBeTruthy();
    expect(screen.getByText("Second spot")).toBeTruthy();
  });

  it("shows the empty slot (not rows) when data is empty", () => {
    render(
      <ListScreen
        data={[]}
        keyExtractor={(i: { id: string; label: string }) => i.id}
        header={<Text>My lists</Text>}
        empty={<Text>Nothing here yet</Text>}
        renderItem={renderRow}
      />,
    );
    expect(screen.getByText("Nothing here yet")).toBeTruthy();
  });
});
