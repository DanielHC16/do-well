import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { AuthProfile } from "@/features/auth/model/auth-state";

import { AuthenticatedHomeScreen } from "../AuthenticatedHomeScreen";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSwitchMode = jest.fn(async () => true);

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
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
  id: "user-a",
  displayName: "Ari Santos",
  homeArea: "Makati",
  onboardingCompletedAt: "2026-10-25T00:00:00.000Z",
};

describe("AuthenticatedHomeScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows a truthful worker empty state and mode-specific actions", async () => {
    const view = await render(
      <AuthenticatedHomeScreen mode="worker" profile={profile} />,
    );

    expect(view.getByText("Good work starts nearby.")).toBeVisible();
    expect(view.getByText("No live gigs yet")).toBeVisible();
    expect(
      view.getByRole("radio", { name: "Show employer workspace" }),
    ).toBeVisible();
    expect(view.queryByText("Post a new gig")).toBeNull();
  });

  it("switches presentation mode and replaces the workspace route", async () => {
    const view = await render(
      <AuthenticatedHomeScreen mode="worker" profile={profile} />,
    );

    await fireEvent.press(
      view.getByRole("radio", { name: "Show employer workspace" }),
    );

    await waitFor(() =>
      expect(mockSwitchMode).toHaveBeenCalledWith("employer"),
    );
    expect(mockReplace).toHaveBeenCalledWith("/(protected)/employer");
  });
});
