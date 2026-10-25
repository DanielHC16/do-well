import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";

import { AuthProvider } from "@/features/auth/context/AuthProvider";
import { useAuth } from "@/features/auth/context/useAuth";
import type { AuthProfile } from "@/features/auth/model/auth-state";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

const completeProfile: AuthProfile = {
  id: "user-123",
  displayName: "Test User",
  homeArea: "Legazpi Village, Makati",
  onboardingCompletedAt: "2026-10-25T00:00:00.000Z",
};

describe("cache-store auth integration", () => {
  it("purges user read cache when user signs out", async () => {
    const purgeUserSpy = jest.fn().mockResolvedValue(undefined);
    const mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      purgeUser: purgeUserSpy,
      clearAll: jest.fn(),
    };

    const dependencies = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ id: "user-123", email: null }),
        getSession: jest.fn().mockResolvedValue({
          accessToken: "token",
          expiresAt: Date.now() + 60_000,
        }),
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        signInWithGoogle: jest.fn(),
        beginGoogleSignIn: jest.fn(),
        exchangeCode: jest.fn(),
        handleOAuthCallback: jest.fn(),
        signOutLocal: jest.fn().mockResolvedValue(undefined),
        startAutoRefresh: jest.fn().mockResolvedValue(undefined),
        stopAutoRefresh: jest.fn().mockResolvedValue(undefined),
        resendConfirmation: jest.fn(),
        requestPasswordReset: jest.fn(),
        updatePassword: jest.fn(),
      },
      profiles: {
        getOwnProfile: jest.fn().mockResolvedValue(completeProfile),
        ensureProfile: jest.fn(),
        completeOnboarding: jest.fn(),
      },
      profileGate: {
        read: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockResolvedValue(undefined),
      },
      cache: mockCache,
      subscribe: jest.fn().mockReturnValue(jest.fn()),
    };

    function TestComponent() {
      const { state, signOut } = useAuth();
      return (
        <>
          <Text testID="route">{state.route}</Text>
          <Text testID="sign-out" onPress={() => signOut()}>
            Sign Out
          </Text>
        </>
      );
    }

    await render(
      <AuthProvider dependencies={dependencies}>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("route")).toHaveTextContent("ready");
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("sign-out"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("route")).toHaveTextContent("signedOut");
    });

    expect(purgeUserSpy).toHaveBeenCalledWith("user-123");
  });
});
