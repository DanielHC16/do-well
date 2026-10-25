import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { AuthProfile } from "@/features/auth/model/auth-state";

import { AccountSettingsScreen } from "../AccountSettingsScreen";

const mockPush = jest.fn();
const mockSwitchMode = jest.fn(async () => true);

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

jest.mock("@/features/shell/context/useShellMode", () => ({
  useShellMode: () => ({
    mode: "worker",
    busy: false,
    error: null,
    switchMode: mockSwitchMode,
    retry: jest.fn(async () => undefined),
  }),
}));

const profile: AuthProfile = {
  id: "80000000-0000-4000-8000-000000000001",
  displayName: "Daniel Camacho",
  homeArea: "Makati",
  onboardingCompletedAt: "2026-10-26T00:00:00.000Z",
};

describe("AccountSettingsScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows identity, account preferences, and privacy settings", async () => {
    const view = await render(
      <AccountSettingsScreen
        capabilities={{ isAdmin: false }}
        onPersistPreferredMode={jest.fn(async () => undefined)}
        onSignOut={jest.fn(async () => undefined)}
        profile={profile}
      />,
    );

    expect(
      view.getByRole("header", { name: "Account settings" }),
    ).toBeVisible();
    expect(view.getByText("Daniel Camacho")).toBeVisible();
    expect(view.getByText("Makati")).toBeVisible();
    expect(view.getByText("Default workspace")).toBeVisible();
    expect(view.getByText("Location & privacy")).toBeVisible();
    expect(view.getByText("Notifications")).toBeVisible();
    expect(view.queryByText("Admin Console")).toBeNull();
  });

  it("persists and activates a different marketplace workspace", async () => {
    const persist = jest.fn(async () => undefined);
    const view = await render(
      <AccountSettingsScreen
        capabilities={{ isAdmin: false }}
        onPersistPreferredMode={persist}
        onSignOut={jest.fn(async () => undefined)}
        profile={profile}
      />,
    );

    await fireEvent.press(
      view.getByRole("radio", { name: "Use Offer work by default" }),
    );

    await waitFor(() => {
      expect(persist).toHaveBeenCalledWith("employer");
      expect(mockSwitchMode).toHaveBeenCalledWith("employer");
    });
    expect(view.getByText("Default workspace updated.")).toBeVisible();
  });

  it("keeps the current workspace and shows a retryable error when persistence fails", async () => {
    const persist = jest.fn(async () => {
      throw new Error("Network unavailable");
    });
    const view = await render(
      <AccountSettingsScreen
        capabilities={{ isAdmin: false }}
        onPersistPreferredMode={persist}
        onSignOut={jest.fn(async () => undefined)}
        profile={profile}
      />,
    );

    await fireEvent.press(
      view.getByRole("radio", { name: "Use Offer work by default" }),
    );

    await waitFor(() => {
      expect(view.getByRole("alert")).toHaveTextContent(
        "We couldn't update your default workspace. Try again.",
      );
    });
    expect(mockSwitchMode).not.toHaveBeenCalled();
  });

  it("shows server-authorized admin access without a role editor", async () => {
    const view = await render(
      <AccountSettingsScreen
        capabilities={{ isAdmin: true }}
        onPersistPreferredMode={jest.fn(async () => undefined)}
        onSignOut={jest.fn(async () => undefined)}
        profile={profile}
      />,
    );

    expect(view.getByText("Platform administrator")).toBeVisible();
    await fireEvent.press(
      view.getByRole("button", { name: "Open Admin Console" }),
    );
    expect(mockPush).toHaveBeenCalledWith("/(protected)/admin");
    expect(view.queryByText(/grant admin/i)).toBeNull();
  });

  it("signs out from the account screen", async () => {
    const onSignOut = jest.fn(async () => undefined);
    const view = await render(
      <AccountSettingsScreen
        capabilities={{ isAdmin: false }}
        onPersistPreferredMode={jest.fn(async () => undefined)}
        onSignOut={onSignOut}
        profile={profile}
      />,
    );

    await fireEvent.press(view.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(onSignOut).toHaveBeenCalledTimes(1));
  });
});
