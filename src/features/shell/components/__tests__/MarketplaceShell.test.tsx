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

  it("keeps compact secondary headers focused on the page title and workspace switch", async () => {
    const view = await render(
      <MarketplaceShell
        compactHeader
        activeSection="work"
        title="My Work"
        subtitle="A long descriptive block"
      >
        <Text>Work content</Text>
      </MarketplaceShell>,
    );
    expect(view.getByRole("header", { name: "My Work" })).toBeVisible();
    expect(view.queryByText("A long descriptive block")).toBeNull();
    expect(view.queryByText("FIND WORK")).toBeNull();
    expect(
      view.getByRole("radio", { name: "Show worker workspace" }),
    ).toBeVisible();
  });

  it("keeps the dashboard header compact and opens real activity without an invented unread count", async () => {
    const view = await render(
      <MarketplaceShell
        dashboard
        activeSection="home"
        title="Hidden duplicate title"
        subtitle="Hidden duplicate description"
      >
        <Text>Dashboard content</Text>
      </MarketplaceShell>,
    );
    expect(view.queryByText("Hidden duplicate title")).toBeNull();
    expect(view.queryByText("MARKETPLACE")).toBeNull();
    expect(view.queryByText("Good work. Close to home.")).toBeNull();
    expect(
      view.getByRole("radio", { name: "Show employer workspace" }),
    ).toBeVisible();
    await fireEvent.press(view.getByRole("button", { name: "Notifications" }));
    expect(mockPush).toHaveBeenCalledWith("/(protected)/activity");
  });

  it("uses product-facing workspace labels and opens profile and work", async () => {
    const view = await render(
      <MarketplaceShell
        activeSection="account"
        subtitle="Manage your marketplace account."
        title="Account settings"
      >
        <Text>Settings content</Text>
      </MarketplaceShell>,
    );

    expect(view.queryByText("MARKETPLACE")).toBeNull();
    expect(view.queryByText("Good work. Close to home.")).toBeNull();
    expect(view.getByRole("button", { name: "Notifications" })).toBeVisible();
    expect(view.getByText("FIND WORK")).toBeVisible();
    expect(view.queryByText("LIVE WORKSPACE")).toBeNull();
    expect(view.queryByText("WORKER VIEW")).toBeNull();

    await fireEvent.press(view.getByRole("tab", { name: "Profile" }));
    expect(mockPush).toHaveBeenCalledWith("/(protected)/profile");
    await fireEvent.press(view.getByRole("tab", { name: "My Work" }));
    expect(mockPush).toHaveBeenCalledWith("/(protected)/work");
    expect(view.getByRole("image", { name: "Do Well logo" })).toBeVisible();
  });
});
