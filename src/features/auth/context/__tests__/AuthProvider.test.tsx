import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { AppState, type AppStateStatus, Text } from "react-native";

import { AuthProvider, type AuthProviderDependencies } from "../AuthProvider";
import { useAuth } from "../useAuth";

jest.mock("../../../../shared/api/supabase", () => ({
  getSupabaseClient: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const completeProfile = {
  id: "user-a",
  displayName: "Ada",
  homeArea: "Makati",
  onboardingCompletedAt: "2026-10-23T00:00:00.000Z",
} as const;

function StateProbe() {
  const { state } = useAuth();
  return (
    <Text>{`${state.route}:${state.status}:${state.userId ?? "none"}`}</Text>
  );
}

function DetailedStateProbe() {
  const { state } = useAuth();
  return (
    <Text>{`${state.route}:${state.status}:${state.userId ?? "none"}:${state.error?.code ?? "none"}:${state.profile?.id ?? "none"}`}</Text>
  );
}

function createDependencies(
  overrides: Partial<AuthProviderDependencies> = {},
): AuthProviderDependencies {
  return {
    auth: {
      getSession: jest.fn().mockResolvedValue({ expiresAt: null }),
      getUser: jest
        .fn()
        .mockResolvedValue({ id: "user-a", email: "ada@example.test" }),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      resendConfirmation: jest.fn(),
      requestPasswordReset: jest.fn(),
      updatePassword: jest.fn(),
      beginGoogleSignIn: jest.fn(),
      exchangeCode: jest.fn(),
      signOutLocal: jest.fn().mockResolvedValue(undefined),
      startAutoRefresh: jest.fn().mockResolvedValue(undefined),
      stopAutoRefresh: jest.fn().mockResolvedValue(undefined),
    },
    profiles: {
      getOwnProfile: jest.fn().mockResolvedValue(completeProfile),
      ensureProfile: jest.fn().mockResolvedValue(completeProfile),
      completeOnboarding: jest.fn().mockResolvedValue(completeProfile),
    },
    profileGate: {
      read: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    },
    subscribe: jest.fn().mockReturnValue(jest.fn()),
    ...overrides,
  };
}

describe("AuthProvider", () => {
  afterEach(async () => cleanup());

  it("restores a provisional session through an authoritative user and profile", async () => {
    const dependencies = createDependencies();
    await render(
      <AuthProvider dependencies={dependencies}>
        <StateProbe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("ready:idle:user-a")).toBeTruthy(),
    );
    expect(dependencies.auth.getSession).toHaveBeenCalledTimes(1);
    expect(dependencies.auth.getUser).toHaveBeenCalledTimes(1);
    expect(dependencies.profiles.getOwnProfile).toHaveBeenCalledWith("user-a");
    expect(dependencies.profileGate.save).toHaveBeenCalledWith(completeProfile);
  });

  it("repairs a missing profile and routes incomplete users to onboarding", async () => {
    const repaired = { ...completeProfile, onboardingCompletedAt: null };
    const dependencies = createDependencies({
      profiles: {
        getOwnProfile: jest.fn().mockResolvedValue(null),
        ensureProfile: jest.fn().mockResolvedValue(repaired),
        completeOnboarding: jest.fn(),
      },
    });

    await render(
      <AuthProvider dependencies={dependencies}>
        <StateProbe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("needsOnboarding:idle:user-a")).toBeTruthy(),
    );
    expect(dependencies.profiles.ensureProfile).toHaveBeenCalledTimes(1);
  });

  it("reloads the server profile after onboarding completion", async () => {
    const incomplete = { ...completeProfile, onboardingCompletedAt: null };
    const getOwnProfile = jest
      .fn()
      .mockResolvedValueOnce(incomplete)
      .mockResolvedValueOnce(completeProfile);
    const dependencies = createDependencies({
      profiles: {
        getOwnProfile,
        ensureProfile: jest.fn(),
        completeOnboarding: jest.fn().mockResolvedValue(completeProfile),
      },
    });

    function OnboardingProbe() {
      const { completeOnboarding, state } = useAuth();
      return (
        <Text onPress={() => void completeOnboarding("Ada", "Makati")}>
          {state.route}
        </Text>
      );
    }

    await render(
      <AuthProvider dependencies={dependencies}>
        <OnboardingProbe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText("needsOnboarding")).toBeTruthy(),
    );
    await act(async () => screen.getByText("needsOnboarding").props.onPress());

    await waitFor(() => expect(screen.getByText("ready")).toBeTruthy());
    expect(dependencies.profiles.completeOnboarding).toHaveBeenCalledWith(
      "Ada",
      "Makati",
      "worker",
    );
    expect(getOwnProfile).toHaveBeenLastCalledWith("user-a");
    expect(dependencies.profileGate.save).toHaveBeenLastCalledWith(
      completeProfile,
    );
  });

  it("does not block authoritative routing when snapshot persistence fails", async () => {
    const dependencies = createDependencies({
      profileGate: {
        read: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockRejectedValue(new Error("storage unavailable")),
        remove: jest.fn().mockResolvedValue(undefined),
      },
    });

    await render(
      <AuthProvider dependencies={dependencies}>
        <StateProbe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("ready:idle:user-a")).toBeTruthy(),
    );
  });

  it("keeps onboarding mounted when completion fails and completes on retry", async () => {
    const incomplete = { ...completeProfile, onboardingCompletedAt: null };
    const completeOnboarding = jest
      .fn()
      .mockRejectedValueOnce({ code: "AUTH_NETWORK_UNAVAILABLE" })
      .mockResolvedValueOnce(completeProfile);
    const getOwnProfile = jest
      .fn()
      .mockResolvedValueOnce(incomplete)
      .mockResolvedValueOnce(completeProfile);
    const dependencies = createDependencies({
      profiles: {
        getOwnProfile,
        ensureProfile: jest.fn(),
        completeOnboarding,
      },
    });

    function RetryProbe() {
      const { completeOnboarding, state } = useAuth();
      return (
        <Text
          onPress={() =>
            void completeOnboarding("Ada", "Makati").catch(() => undefined)
          }
        >
          {`${state.route}:${state.status}`}
        </Text>
      );
    }

    await render(
      <AuthProvider dependencies={dependencies}>
        <RetryProbe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText("needsOnboarding:idle")).toBeTruthy(),
    );
    await act(async () =>
      screen.getByText("needsOnboarding:idle").props.onPress(),
    );

    expect(screen.getByText("needsOnboarding:idle")).toBeTruthy();

    await act(async () =>
      screen.getByText("needsOnboarding:idle").props.onPress(),
    );

    await waitFor(() => expect(screen.getByText("ready:idle")).toBeTruthy());
    expect(completeOnboarding).toHaveBeenCalledTimes(2);
    expect(getOwnProfile).toHaveBeenLastCalledWith("user-a");
  });

  it("discards a completed onboarding request after the account signs out", async () => {
    const incomplete = { ...completeProfile, onboardingCompletedAt: null };
    let resolveCompletion: ((profile: typeof completeProfile) => void) | null =
      null;
    const completion = new Promise<typeof completeProfile>((resolve) => {
      resolveCompletion = resolve;
    });
    let listener: ((event: string, userId: string | null) => void) | undefined;
    const dependencies = createDependencies({
      profiles: {
        getOwnProfile: jest.fn().mockResolvedValue(incomplete),
        ensureProfile: jest.fn(),
        completeOnboarding: jest.fn().mockReturnValue(completion),
      },
      subscribe: jest.fn().mockImplementation((next) => {
        listener = next;
        return jest.fn();
      }),
    });

    function CompletionProbe() {
      const { completeOnboarding, state } = useAuth();
      return (
        <Text
          onPress={() =>
            void completeOnboarding("Ada", "Makati").catch(() => undefined)
          }
        >
          {state.route}
        </Text>
      );
    }

    await render(
      <AuthProvider dependencies={dependencies}>
        <CompletionProbe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText("needsOnboarding")).toBeTruthy(),
    );
    await act(async () => screen.getByText("needsOnboarding").props.onPress());
    await waitFor(() => expect(listener).toBeDefined());
    await act(async () => listener?.("SIGNED_OUT", null));
    await act(async () => resolveCompletion?.(completeProfile));

    expect(screen.getByText("signedOut")).toBeTruthy();
    expect(dependencies.profiles.getOwnProfile).toHaveBeenCalledTimes(1);
  });

  it("subscribes once, tears down, and controls refresh with AppState", async () => {
    const unsubscribe = jest.fn();
    const dependencies = createDependencies({
      subscribe: jest.fn().mockReturnValue(unsubscribe),
    });
    const appStateSpy = jest.spyOn(AppState, "addEventListener");
    let appStateListener: ((state: AppStateStatus) => void) | undefined;
    appStateSpy.mockImplementation((_event, listener) => {
      appStateListener = listener;
      return { remove: jest.fn() };
    });

    await render(
      <AuthProvider dependencies={dependencies}>
        <StateProbe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText("ready:idle:user-a")).toBeTruthy(),
    );

    expect(dependencies.subscribe).toHaveBeenCalledTimes(1);
    await act(async () => appStateListener?.("active"));
    await act(async () => appStateListener?.("background"));
    expect(dependencies.auth.startAutoRefresh).toHaveBeenCalled();
    expect(dependencies.auth.getUser).toHaveBeenCalledTimes(2);
    expect(dependencies.auth.stopAutoRefresh).toHaveBeenCalled();

    await cleanup();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    appStateSpy.mockRestore();
  });

  it("keeps restoration blocked with explicit offline state", async () => {
    const dependencies = createDependencies({
      auth: {
        ...createDependencies().auth,
        getUser: jest
          .fn()
          .mockRejectedValue({ code: "AUTH_NETWORK_UNAVAILABLE" }),
      },
    });

    await render(
      <AuthProvider dependencies={dependencies}>
        <StateProbe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("restoring:offline:none")).toBeTruthy(),
    );
  });

  it("keeps an established route and profile available when foreground validation is offline", async () => {
    const auth = createDependencies().auth;
    auth.getUser = jest
      .fn()
      .mockResolvedValueOnce({ id: "user-a", email: null })
      .mockRejectedValueOnce({ code: "AUTH_NETWORK_UNAVAILABLE" })
      .mockResolvedValueOnce({ id: "user-a", email: null });
    const dependencies = createDependencies({ auth });
    let appStateListener: ((state: AppStateStatus) => void) | undefined;
    const appStateSpy = jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event, listener) => {
        appStateListener = listener;
        return { remove: jest.fn() };
      });

    await render(
      <AuthProvider dependencies={dependencies}>
        <DetailedStateProbe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText("ready:idle:user-a:none:user-a")).toBeTruthy(),
    );
    await act(async () => appStateListener?.("active"));

    await waitFor(() =>
      expect(
        screen.getByText(
          "ready:offline:user-a:AUTH_NETWORK_UNAVAILABLE:user-a",
        ),
      ).toBeTruthy(),
    );
    await act(async () => appStateListener?.("active"));
    await waitFor(() =>
      expect(screen.getByText("ready:idle:user-a:none:user-a")).toBeTruthy(),
    );
    appStateSpy.mockRestore();
  });

  it("restores a different authoritative identity found on foreground validation", async () => {
    const auth = createDependencies().auth;
    auth.getUser = jest
      .fn()
      .mockResolvedValueOnce({ id: "user-a", email: null })
      .mockResolvedValueOnce({ id: "user-b", email: null })
      .mockResolvedValueOnce({ id: "user-b", email: null });
    const dependencies = createDependencies({
      auth,
      profiles: {
        getOwnProfile: jest.fn().mockImplementation(async (userId: string) => ({
          ...completeProfile,
          id: userId,
        })),
        ensureProfile: jest.fn(),
        completeOnboarding: jest.fn(),
      },
    });
    let appStateListener: ((state: AppStateStatus) => void) | undefined;
    const appStateSpy = jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event, listener) => {
        appStateListener = listener;
        return { remove: jest.fn() };
      });

    await render(
      <AuthProvider dependencies={dependencies}>
        <StateProbe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText("ready:idle:user-a")).toBeTruthy(),
    );
    await act(async () => appStateListener?.("active"));

    await waitFor(() =>
      expect(screen.getByText("ready:idle:user-b")).toBeTruthy(),
    );
    expect(dependencies.profileGate.remove).toHaveBeenCalledWith("user-a");
    appStateSpy.mockRestore();
  });

  it("revokes an established route when foreground validation finds no user", async () => {
    const auth = createDependencies().auth;
    auth.getUser = jest
      .fn()
      .mockResolvedValueOnce({ id: "user-a", email: null })
      .mockResolvedValueOnce(null);
    const dependencies = createDependencies({ auth });
    let appStateListener: ((state: AppStateStatus) => void) | undefined;
    const appStateSpy = jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event, listener) => {
        appStateListener = listener;
        return { remove: jest.fn() };
      });

    await render(
      <AuthProvider dependencies={dependencies}>
        <StateProbe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText("ready:idle:user-a")).toBeTruthy(),
    );
    await act(async () => appStateListener?.("active"));

    await waitFor(() =>
      expect(screen.getByText("signedOut:idle:none")).toBeTruthy(),
    );
    expect(dependencies.profileGate.remove).toHaveBeenCalledWith("user-a");
    appStateSpy.mockRestore();
  });

  it("blocks with a retryable error when an authenticated profile load fails", async () => {
    const dependencies = createDependencies({
      profiles: {
        getOwnProfile: jest
          .fn()
          .mockRejectedValue({ code: "AUTH_PROFILE_UNAVAILABLE" }),
        ensureProfile: jest.fn(),
        completeOnboarding: jest.fn(),
      },
    });

    await render(
      <AuthProvider dependencies={dependencies}>
        <DetailedStateProbe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(
        screen.getByText("restoring:idle:user-a:AUTH_PROFILE_UNAVAILABLE:none"),
      ).toBeTruthy(),
    );
  });

  it("preserves a stable profile failure code while blocking", async () => {
    const dependencies = createDependencies({
      profiles: {
        getOwnProfile: jest
          .fn()
          .mockRejectedValue({ code: "AUTH_RATE_LIMITED" }),
        ensureProfile: jest.fn(),
        completeOnboarding: jest.fn(),
      },
    });

    await render(
      <AuthProvider dependencies={dependencies}>
        <DetailedStateProbe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(
        screen.getByText("restoring:idle:user-a:AUTH_RATE_LIMITED:none"),
      ).toBeTruthy(),
    );
  });

  it("rejects stale restoration after an account-change event", async () => {
    let resolveFirstUser:
      ((value: { id: string; email: null }) => void) | null = null;
    const firstUser = new Promise<{ id: string; email: null }>((resolve) => {
      resolveFirstUser = resolve;
    });
    let listener: ((event: string, userId: string | null) => void) | undefined;
    const auth = createDependencies().auth;
    auth.getUser = jest
      .fn()
      .mockReturnValueOnce(firstUser)
      .mockResolvedValue({ id: "user-b", email: null });
    const dependencies = createDependencies({
      auth,
      profiles: {
        getOwnProfile: jest.fn().mockImplementation(async (userId: string) => ({
          ...completeProfile,
          id: userId,
        })),
        ensureProfile: jest.fn(),
        completeOnboarding: jest.fn(),
      },
      subscribe: jest.fn().mockImplementation((next) => {
        listener = next;
        return jest.fn();
      }),
    });

    await render(
      <AuthProvider dependencies={dependencies}>
        <StateProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(listener).toBeDefined());
    await act(async () => listener?.("SIGNED_IN", "user-b"));
    await waitFor(() =>
      expect(screen.getByText("ready:idle:user-b")).toBeTruthy(),
    );
    await act(async () => resolveFirstUser?.({ id: "user-a", email: null }));

    expect(screen.getByText("ready:idle:user-b")).toBeTruthy();
  });

  it("clears the prior identity on the supported signed-out event", async () => {
    let listener: ((event: string, userId: string | null) => void) | undefined;
    const dependencies = createDependencies({
      subscribe: jest.fn().mockImplementation((next) => {
        listener = next;
        return jest.fn();
      }),
    });

    function LogoutProbe() {
      const { signOut, state } = useAuth();
      return (
        <Text onPress={() => void signOut()}>{`${state.route}:logout`}</Text>
      );
    }

    await render(
      <AuthProvider dependencies={dependencies}>
        <LogoutProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText("ready:logout")).toBeTruthy());
    await waitFor(() => expect(listener).toBeDefined());
    await act(async () => listener?.("SIGNED_OUT", null));
    expect(screen.getByText("signedOut:logout")).toBeTruthy();
    expect(dependencies.profileGate.remove).toHaveBeenCalledWith("user-a");
  });

  it("finishes local sign-out and cleanup when the auth client rejects", async () => {
    const auth = createDependencies().auth;
    auth.signOutLocal = jest
      .fn()
      .mockRejectedValue({ code: "AUTH_NETWORK_UNAVAILABLE" });
    const dependencies = createDependencies({ auth });

    function LogoutProbe() {
      const { signOut, state } = useAuth();
      return <Text onPress={() => void signOut()}>{state.route}</Text>;
    }

    await render(
      <AuthProvider dependencies={dependencies}>
        <LogoutProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText("ready")).toBeTruthy());
    await act(async () => screen.getByText("ready").props.onPress());

    await waitFor(() => expect(screen.getByText("signedOut")).toBeTruthy());
    expect(dependencies.profileGate.remove).toHaveBeenCalledWith("user-a");
  });

  it("removes a snapshot written by a restore superseded during persistence", async () => {
    let finishOldSave: (() => void) | null = null;
    const oldSave = new Promise<void>((resolve) => {
      finishOldSave = resolve;
    });
    let listener: ((event: string, userId: string | null) => void) | undefined;
    const auth = createDependencies().auth;
    auth.getUser = jest
      .fn()
      .mockResolvedValueOnce({ id: "user-a", email: null })
      .mockResolvedValueOnce({ id: "user-b", email: null });
    const profileGate = {
      read: jest.fn().mockResolvedValue(null),
      save: jest
        .fn()
        .mockImplementation((nextProfile) =>
          nextProfile.id === "user-a" ? oldSave : Promise.resolve(),
        ),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const dependencies = createDependencies({
      auth,
      profileGate,
      profiles: {
        getOwnProfile: jest.fn().mockImplementation(async (userId: string) => ({
          ...completeProfile,
          id: userId,
        })),
        ensureProfile: jest.fn(),
        completeOnboarding: jest.fn(),
      },
      subscribe: jest.fn().mockImplementation((next) => {
        listener = next;
        return jest.fn();
      }),
    });

    await render(
      <AuthProvider dependencies={dependencies}>
        <StateProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(listener).toBeDefined());
    await waitFor(() => expect(profileGate.save).toHaveBeenCalledTimes(1));
    await act(async () => listener?.("SIGNED_IN", "user-b"));
    await waitFor(() => expect(profileGate.save).toHaveBeenCalledTimes(2));
    await act(async () => finishOldSave?.());

    await waitFor(() =>
      expect(screen.getByText("ready:idle:user-b")).toBeTruthy(),
    );
    expect(profileGate.remove).toHaveBeenCalledWith("user-a");
  });

  it("removes the prior user's snapshot before routing a new account", async () => {
    let listener: ((event: string, userId: string | null) => void) | undefined;
    const auth = createDependencies().auth;
    auth.getUser = jest
      .fn()
      .mockResolvedValueOnce({ id: "user-a", email: null })
      .mockResolvedValueOnce({ id: "user-b", email: null });
    const dependencies = createDependencies({
      auth,
      profiles: {
        getOwnProfile: jest.fn().mockImplementation(async (userId: string) => ({
          ...completeProfile,
          id: userId,
        })),
        ensureProfile: jest.fn(),
        completeOnboarding: jest.fn(),
      },
      subscribe: jest.fn().mockImplementation((next) => {
        listener = next;
        return jest.fn();
      }),
    });

    await render(
      <AuthProvider dependencies={dependencies}>
        <StateProbe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText("ready:idle:user-a")).toBeTruthy(),
    );
    await act(async () => listener?.("SIGNED_IN", "user-b"));

    await waitFor(() =>
      expect(screen.getByText("ready:idle:user-b")).toBeTruthy(),
    );
    expect(dependencies.profileGate.remove).toHaveBeenCalledWith("user-a");
  });
});
