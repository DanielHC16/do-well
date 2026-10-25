import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { MarketplaceShell } from "../MarketplaceShell";

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock("@/features/connectivity/components/OfflineBanner", () => ({
  OfflineBanner: () => null,
}));

jest.mock("@/features/shell/context/useShellMode", () => ({
  useShellMode: () => ({
    mode: "worker",
    busy: false,
    error: null,
    switchMode: jest.fn(async () => true),
    retry: jest.fn(async () => undefined),
  }),
}));

describe("MarketplaceShell", () => {
  beforeEach(() => jest.clearAllMocks());

  it("uses product-facing workspace labels and opens account settings", async () => {
    const view = await render(
      <MarketplaceShell
        activeSection="account"
        subtitle="Manage your marketplace account."
        title="Account settings"
      >
        <Text>Settings content</Text>
      </MarketplaceShell>,
    );

    expect(view.getByText("MARKETPLACE")).toBeVisible();
    expect(view.getByText("FIND WORK")).toBeVisible();
    expect(view.queryByText("LIVE WORKSPACE")).toBeNull();
    expect(view.queryByText("WORKER VIEW")).toBeNull();

    await fireEvent.press(view.getByRole("tab", { name: "Account" }));
    expect(mockPush).toHaveBeenCalledWith("/(protected)/settings");
  });
});
