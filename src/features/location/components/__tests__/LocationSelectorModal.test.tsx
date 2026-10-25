import { fireEvent, render } from "@testing-library/react-native";

import {
  findLocalityById,
  type LocalityOption,
} from "../../model/location-schemas";
import { LocationSelectorModal } from "../LocationSelectorModal";

describe("LocationSelectorModal", () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    activeLocation: {
      source: "none" as const,
      label: "Not set",
      latitude: null,
      longitude: null,
      accuracy: null,
      timestamp: null,
    },
    radiusKm: null,
    onSelectGps: jest.fn().mockResolvedValue(undefined),
    onSelectLocality: jest.fn(),
    onSelectRadius: jest.fn(),
    onClearLocation: jest.fn(),
  };

  it("renders correctly and triggers onSelectGps when GPS button is pressed", async () => {
    const onSelectGps = jest.fn().mockResolvedValue(undefined);
    const view = await render(
      <LocationSelectorModal {...defaultProps} onSelectGps={onSelectGps} />,
    );

    expect(view.getByText("Location & Radius")).toBeTruthy();
    expect(view.getByText("Use My Current Location")).toBeTruthy();

    await fireEvent.press(view.getByText("Use My Current Location"));
    expect(onSelectGps).toHaveBeenCalledTimes(1);
  });

  it("shows loading state when isLocating is true", async () => {
    const view = await render(
      <LocationSelectorModal {...defaultProps} isLocating />,
    );

    expect(view.getByText("Acquiring GPS fix...")).toBeTruthy();
  });

  it("triggers onSelectRadius when radius pill is pressed", async () => {
    const onSelectRadius = jest.fn();
    const view = await render(
      <LocationSelectorModal
        {...defaultProps}
        onSelectRadius={onSelectRadius}
      />,
    );

    await fireEvent.press(view.getByText("10 km"));
    expect(onSelectRadius).toHaveBeenCalledWith(10);
  });

  it("triggers onSelectLocality when a locality card is pressed", async () => {
    const onSelectLocality = jest.fn();
    const view = await render(
      <LocationSelectorModal
        {...defaultProps}
        onSelectLocality={onSelectLocality}
      />,
    );

    await fireEvent.press(view.getByText("Bonifacio Global City"));
    expect(onSelectLocality).toHaveBeenCalledWith(
      expect.objectContaining<Partial<LocalityOption>>({
        id: "bgc-taguig",
        name: "Bonifacio Global City",
      }),
    );
  });

  it("displays error message if provided", async () => {
    const view = await render(
      <LocationSelectorModal
        {...defaultProps}
        errorMessage="GPS signal weak or unavailable"
      />,
    );

    expect(view.getByText("GPS signal weak or unavailable")).toBeTruthy();
  });

  it("displays blocked permission notice when permissionState is blocked", async () => {
    const view = await render(
      <LocationSelectorModal {...defaultProps} permissionState="blocked" />,
    );

    expect(
      view.getByText(
        "Location permission is blocked. Select a Metro Manila hub below.",
      ),
    ).toBeTruthy();
  });

  it("displays services disabled notice when permissionState is services_disabled", async () => {
    const view = await render(
      <LocationSelectorModal
        {...defaultProps}
        permissionState="services_disabled"
      />,
    );

    expect(
      view.getByText(
        "Device location is turned off. Select a Metro Manila hub below.",
      ),
    ).toBeTruthy();
  });

  it("triggers onClearLocation when reset is pressed", async () => {
    const onClearLocation = jest.fn();
    const makati = findLocalityById("makati-cbd")!;
    const view = await render(
      <LocationSelectorModal
        {...defaultProps}
        activeLocation={{
          source: "locality",
          label: makati.name,
          latitude: makati.latitude,
          longitude: makati.longitude,
          accuracy: null,
          timestamp: null,
        }}
        onClearLocation={onClearLocation}
      />,
    );

    await fireEvent.press(view.getByText("Reset to All Locations"));
    expect(onClearLocation).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Done is pressed", async () => {
    const onClose = jest.fn();
    const view = await render(
      <LocationSelectorModal {...defaultProps} onClose={onClose} />,
    );

    await fireEvent.press(view.getByText("Done"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
