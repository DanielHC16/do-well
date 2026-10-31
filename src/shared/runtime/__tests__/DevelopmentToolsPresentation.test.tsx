import { render, waitFor } from "@testing-library/react-native";
import { setToolsButtonVisible } from "expo-dev-client";
import { DevelopmentToolsPresentation } from "../DevelopmentToolsPresentation";

jest.mock("expo-dev-client", () => ({ setToolsButtonVisible: jest.fn() }));

const originalDev = __DEV__;
afterEach(() => {
  Object.defineProperty(globalThis, "__DEV__", {
    value: originalDev,
    configurable: true,
    writable: true,
  });
  jest.clearAllMocks();
});

it("hides the development tools overlay without changing the application header", async () => {
  Object.defineProperty(globalThis, "__DEV__", {
    value: true,
    configurable: true,
    writable: true,
  });
  await render(<DevelopmentToolsPresentation />);
  await waitFor(() =>
    expect(setToolsButtonVisible).toHaveBeenCalledWith(false),
  );
});

it("does not invoke native development tooling in release mode", async () => {
  Object.defineProperty(globalThis, "__DEV__", {
    value: false,
    configurable: true,
    writable: true,
  });
  await render(<DevelopmentToolsPresentation />);
  expect(setToolsButtonVisible).not.toHaveBeenCalled();
});
