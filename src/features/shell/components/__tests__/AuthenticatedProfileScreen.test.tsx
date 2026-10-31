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

  it("shows a centered identity, real work counts and a settings list without page eyebrows", async () => {
    const list = jest
      .fn()
      .mockResolvedValueOnce(new Array(3).fill(null))
      .mockResolvedValueOnce(new Array(1).fill(null))
      .mockResolvedValueOnce(new Array(20).fill(null));
    const view = await render(
      <AuthenticatedProfileScreen
        busy={false}
        onSignOut={jest.fn()}
        profile={profile}
        editorGateway={{
          read: jest.fn(async () => ({
            id: profile.id,
            displayName: profile.displayName,
            homeArea: "Makati",
            bio: "",
          })),
          save: jest.fn(),
        }}
        stats={{
          pageSize: 20,
          work: { list },
          applicants: { listGigApplicants: jest.fn() },
        }}
      />,
    );
    expect(view.getByRole("header", { name: "Ari Santos" })).toBeVisible();
    expect(view.queryByText("FIND WORK")).toBeNull();
    expect(
      view.queryByText("Your introduction to the people you work with."),
    ).toBeNull();
    expect(await view.findByLabelText("3 Applications")).toBeVisible();
    expect(view.getByLabelText("1 Active")).toBeVisible();
    expect(view.getByLabelText("20+ Completed")).toBeVisible();
    expect(list).toHaveBeenCalledWith(profile.id, "worker", "applications");
    await fireEvent.press(view.getByRole("button", { name: "My work" }));
    expect(mockPush).toHaveBeenCalledWith("/(protected)/work");
  });

  it("retries a failed profile read in place without opening the editor", async () => {
    const read = jest
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        id: profile.id,
        displayName: profile.displayName,
        homeArea: "Makati",
        bio: "Back online",
      });
    const view = await render(
      <AuthenticatedProfileScreen
        busy={false}
        onSignOut={jest.fn()}
        profile={profile}
        editorGateway={{ read, save: jest.fn() }}
      />,
    );
    await fireEvent.press(
      await view.findByRole("button", { name: "Try again" }),
    );
    expect(await view.findByText("Back online")).toBeVisible();
    expect(read).toHaveBeenCalledTimes(2);
    expect(view.queryByText("Display name")).toBeNull();
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
