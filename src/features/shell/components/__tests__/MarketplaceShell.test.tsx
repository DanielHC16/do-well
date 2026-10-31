import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { MarketplaceShell } from "../MarketplaceShell";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSwitchMode = jest.fn(async () => true);
let mockMode: "worker" | "employer" = "worker";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock("@/features/connectivity/components/OfflineBanner", () => ({
  OfflineBanner: () => null,
}));

jest.mock("@/features/shell/context/useUnreadActivity", () => ({
  useUnreadActivity: () => false,
}));

jest.mock("@/features/shell/context/useShellMode", () => ({
  useShellMode: () => ({
    mode: mockMode,
    busy: false,
    error: null,
    switchMode: mockSwitchMode,
    retry: jest.fn(async () => undefined),
  }),
}));

describe("MarketplaceShell", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMode = "worker";
  });

  it("shows one navy header with the screen name and no page eyebrow or subtitle", async () => {
    const view = await render(
      <MarketplaceShell
        activeSection="work"
        title="My work"
        subtitle="A long descriptive block"
      >
        <Text>Work content</Text>
      </MarketplaceShell>,
    );
    expect(view.getByRole("header", { name: "My work" })).toBeVisible();
    expect(view.queryByText("A long descriptive block")).toBeNull();
    expect(view.queryByText("FIND WORK")).toBeNull();
    expect(view.getByText("Work content")).toBeVisible();
  });

  it("renders exactly one compact workspace switch in the header", async () => {
    const view = await render(
      <MarketplaceShell activeSection="home" title="ignored">
        <Text>Dashboard content</Text>
      </MarketplaceShell>,
    );
    expect(view.getByRole("header", { name: "Discover gigs" })).toBeVisible();
    expect(view.getAllByRole("radio")).toHaveLength(2);
    expect(
      view.getByRole("radio", { name: "Show worker workspace" }),
    ).toBeChecked();
    await fireEvent.press(
      view.getByRole("radio", { name: "Show employer workspace" }),
    );
    expect(mockSwitchMode).toHaveBeenCalledWith("employer");
    expect(mockReplace).toHaveBeenCalledWith("/(protected)/employer");
  });

  it("navigates with the tab bar and header buttons", async () => {
    const view = await render(
      <MarketplaceShell activeSection="account" title="Account settings">
        <Text>Settings content</Text>
      </MarketplaceShell>,
    );
    expect(view.getByRole("tab", { name: "Profile" })).toBeSelected();
    await fireEvent.press(view.getByRole("tab", { name: "My Work" }));
    expect(mockPush).toHaveBeenCalledWith("/(protected)/work");
    await fireEvent.press(view.getByRole("tab", { name: "Home" }));
    expect(mockReplace).toHaveBeenCalledWith("/(protected)/worker");
    await fireEvent.press(view.getByRole("button", { name: "Notifications" }));
    expect(mockPush).toHaveBeenCalledWith("/(protected)/activity");
    await fireEvent.press(
      view.getByRole("button", { name: "Open your profile" }),
    );
    expect(mockPush).toHaveBeenCalledWith("/(protected)/profile");
  });

  it("opens a find-gigs sheet from the center button in Find work mode", async () => {
    const view = await render(
      <MarketplaceShell activeSection="home" title="Home">
        <Text>Home</Text>
      </MarketplaceShell>,
    );
    await fireEvent.press(view.getByRole("button", { name: "Find gigs" }));
    await fireEvent.press(view.getByRole("button", { name: "Browse remote" }));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/(protected)/worker",
      params: { intent: "remote", at: expect.any(String) },
    });
  });

  it("posts a gig from the center button in Offer work mode", async () => {
    mockMode = "employer";
    const view = await render(
      <MarketplaceShell activeSection="home" title="Home">
        <Text>Home</Text>
      </MarketplaceShell>,
    );
    expect(view.getByRole("header", { name: "Your workspace" })).toBeVisible();
    await fireEvent.press(view.getByRole("button", { name: "Post a gig" }));
    expect(mockPush).toHaveBeenCalledWith("/(protected)/employer/gigs/new");
  });

  it("shows the search button only when the screen provides search", async () => {
    const onSearch = jest.fn();
    const view = await render(
      <MarketplaceShell activeSection="home" title="Home" onSearch={onSearch}>
        <Text>Home</Text>
      </MarketplaceShell>,
    );
    await fireEvent.press(view.getByRole("button", { name: "Open search" }));
    expect(onSearch).toHaveBeenCalled();
  });
});
