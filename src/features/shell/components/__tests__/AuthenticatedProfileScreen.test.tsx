import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { AuthProfile } from "@/features/auth/model/auth-state";

import { AuthenticatedProfileScreen } from "../AuthenticatedProfileScreen";

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
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

const profile: AuthProfile = {
  id: "user-a",
  displayName: "Ari Santos",
  homeArea: "Makati",
  onboardingCompletedAt: "2026-10-25T00:00:00.000Z",
};

describe("AuthenticatedProfileScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders profile details and dispatches sign out when requested", async () => {
    const onSignOut = jest.fn(async () => undefined);
    const view = await render(
      <AuthenticatedProfileScreen
        busy={false}
        onSignOut={onSignOut}
        profile={profile}
      />,
    );

    expect(view.getByText("Ari Santos")).toBeVisible();
    expect(view.getByText("Makati")).toBeVisible();

    const signOutButton = view.getByRole("button", { name: "Sign out" });
    await fireEvent.press(signOutButton);

    await waitFor(() => expect(onSignOut).toHaveBeenCalledTimes(1));
  });

  it("disables sign out button and displays busy state while signing out", async () => {
    const onSignOut = jest.fn(async () => undefined);
    const view = await render(
      <AuthenticatedProfileScreen
        busy={true}
        onSignOut={onSignOut}
        profile={profile}
      />,
    );

    expect(view.getByText("Signing out...")).toBeVisible();
    const button = view.getByRole("button", { name: "Signing out" });
    expect(button.props.accessibilityState.disabled).toBe(true);
  });
});
