import { render, screen } from "@testing-library/react-native";
import { useAuth } from "@/features/auth/context/useAuth";

import OnboardingLayout from "../../(onboarding)/_layout";
import ProtectedLayout from "../_layout";

jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Text } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    Redirect: ({ href }: { href: string }) =>
      React.createElement(Text, null, href),
    Stack: () => React.createElement(Text, null, "guarded route content"),
  };
});

jest.mock("@/features/auth/context/useAuth", () => ({
  useAuth: jest.fn(),
}));

const mockedUseAuth = jest.mocked(useAuth);
const actions = {
  signUp: jest.fn(),
  signInWithPassword: jest.fn(),
  beginGoogleSignIn: jest.fn(),
  exchangeCode: jest.fn(),
  resendConfirmation: jest.fn(),
  requestPasswordReset: jest.fn(),
  updatePassword: jest.fn(),
  completeOnboarding: jest.fn(),
  refresh: jest.fn(),
  signOut: jest.fn(),
};

function useRoute(route: "signedOut" | "needsOnboarding" | "ready") {
  mockedUseAuth.mockReturnValue({
    ...actions,
    state: {
      route,
      status: "idle",
      userId: route === "signedOut" ? null : "user-a",
      profile: null,
      error: null,
      operationId: 1,
    },
  });
}

describe("authentication route guards", () => {
  it("rejects direct protected access until onboarding is complete", async () => {
    useRoute("needsOnboarding");

    await render(<ProtectedLayout />);

    expect(screen.getByText("../(onboarding)")).toBeVisible();
    expect(screen.queryByText("guarded route content")).toBeNull();
  });

  it("rejects protected access after sign-out", async () => {
    useRoute("signedOut");

    await render(<ProtectedLayout />);

    expect(screen.getByText("../(public)/sign-in")).toBeVisible();
  });

  it("leaves onboarding only after the server-backed gate is ready", async () => {
    useRoute("ready");

    await render(<OnboardingLayout />);

    expect(screen.getByText("../(protected)")).toBeVisible();
  });
});
