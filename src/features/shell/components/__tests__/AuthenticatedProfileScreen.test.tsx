import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { AuthProfile } from "@/features/auth/model/auth-state";

import { AuthenticatedProfileScreen } from "../AuthenticatedProfileScreen";

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("@/shared/api/supabase", () => ({ getSupabaseClient: jest.fn() }));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useFocusEffect: (effect: () => void | (() => void)) => {
    const React = jest.requireActual<typeof import("react")>("react");
    React.useEffect(effect, [effect]);
  },
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

  it("loads the current biography on focus without requiring an edit", async () => {
    const gateway = {
      read: jest.fn(async () => ({
        id: profile.id,
        displayName: profile.displayName,
        homeArea: "Makati",
        bio: "Student designer",
      })),
      save: jest.fn(),
    };
    const view = await render(
      <AuthenticatedProfileScreen
        busy={false}
        onSignOut={jest.fn()}
        profile={profile}
        editorGateway={gateway}
      />,
    );
    await waitFor(() =>
      expect(view.getByText("Student designer")).toBeVisible(),
    );
    expect(gateway.read).toHaveBeenCalledWith(profile.id);
  });

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

  it("opens settings and reports a failed profile read honestly", async () => {
    const gateway = {
      read: jest.fn(async () => {
        throw new Error("private");
      }),
      save: jest.fn(),
    };
    const view = await render(
      <AuthenticatedProfileScreen
        busy={false}
        onSignOut={jest.fn()}
        profile={profile}
        editorGateway={gateway}
      />,
    );
    await fireEvent.press(view.getByRole("button", { name: "Settings" }));
    expect(mockPush).toHaveBeenCalledWith("/(protected)/settings");
    await fireEvent.press(view.getByRole("button", { name: "Edit profile" }));
    await waitFor(() =>
      expect(view.getByRole("alert")).toHaveTextContent(
        /couldn't load your profile/,
      ),
    );
    expect(view.queryByText("Profile updated")).toBeNull();
  });
});
