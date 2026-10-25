import { fireEvent, render } from "@testing-library/react-native";

import { LocationBar } from "../LocationBar";

describe("LocationBar", () => {
  it("renders when GPS location is active", async () => {
    const onPress = jest.fn();
    const view = await render(
      <LocationBar
        activeLocation={{
          source: "gps",
          label: "Current location (~15m)",
          latitude: 14.5547,
          longitude: 121.0244,
          accuracy: 15,
          timestamp: 1729864800000,
        }}
        onPress={onPress}
        radiusKm={10}
      />,
    );

    expect(view.getByText("GPS FIX")).toBeTruthy();
    expect(view.getByText("Current location (~15m)")).toBeTruthy();
    expect(view.getByText("Filtering: Within 10 km")).toBeTruthy();

    await fireEvent.press(view.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders when manual locality is active", async () => {
    const onPress = jest.fn();
    const view = await render(
      <LocationBar
        activeLocation={{
          source: "locality",
          label: "Makati CBD",
          latitude: 14.5547,
          longitude: 121.0244,
          accuracy: null,
          timestamp: null,
        }}
        onPress={onPress}
        radiusKm={null}
      />,
    );

    expect(view.getByText("MANUAL LOCALITY")).toBeTruthy();
    expect(view.getByText("Makati CBD")).toBeTruthy();
    expect(view.getByText("Filtering: Any distance")).toBeTruthy();
  });

  it("renders when location is not set", async () => {
    const onPress = jest.fn();
    const view = await render(
      <LocationBar
        activeLocation={{
          source: "none",
          label: "Not set",
          latitude: null,
          longitude: null,
          accuracy: null,
          timestamp: null,
        }}
        onPress={onPress}
        radiusKm={null}
      />,
    );

    expect(view.getByText("NOT SET")).toBeTruthy();
    expect(view.getByText("Set location for nearby gigs")).toBeTruthy();
  });
});
