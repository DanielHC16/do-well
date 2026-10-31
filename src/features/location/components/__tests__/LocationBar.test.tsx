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

    expect(view.queryByText("GPS FIX")).toBeNull();
    expect(view.getByText("Current location (~15m)")).toBeTruthy();
    expect(view.getByText("Within 10 km")).toBeTruthy();
    expect(
      view.getByRole("button", { name: "Location and radius filter" }),
    ).toHaveAccessibilityValue({
      text: "Current location (~15m), Within 10 km",
    });

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

    expect(view.getByText("Makati CBD")).toBeTruthy();
    expect(view.getByText("Any distance")).toBeTruthy();
    expect(
      view.getByRole("button", { name: "Location and radius filter" }),
    ).toHaveAccessibilityValue({ text: "Makati CBD, Any distance" });
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

    expect(view.getByText("Choose an area")).toBeTruthy();
    expect(view.getByText("Optional · Remote gigs available")).toBeTruthy();
  });
});
