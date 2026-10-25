import { render, screen, waitFor } from "@testing-library/react-native";
import { useAuth } from "@/features/auth/context/useAuth";
import { readAppRuntime } from "@/shared/config/app-runtime";

import DemoLayout from "../../(demo)/_layout";
import OnboardingLayout from "../../(onboarding)/_layout";
import PublicLayout from "../../(public)/_layout";
import ProtectedLayout from "../_layout";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => "worker"),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

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

jest.mock("@/shared/config/app-runtime", () => ({
  readAppRuntime: jest.fn(() => "production"),
}));

const mockedUseAuth = jest.mocked(useAuth);
const mockedReadAppRuntime = jest.mocked(readAppRuntime);
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
  beforeEach(() => {
    mockedReadAppRuntime.mockReturnValue("production");
    jest.clearAllMocks();
  });

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

  it("renders protected shell content when authenticated and ready", async () => {
    useRoute("ready");

    await render(<ProtectedLayout />);

    await waitFor(() => {
      expect(screen.getByText("guarded route content")).toBeVisible();
    });
  });

  it("leaves onboarding only after the server-backed gate is ready", async () => {
    useRoute("ready");

    await render(<OnboardingLayout />);

    expect(screen.getByText("../(protected)")).toBeVisible();
  });

  it.each([
    ["public", PublicLayout],
    ["onboarding", OnboardingLayout],
    ["protected", ProtectedLayout],
  ])(
    "redirects the %s group to demo before reading auth context",
    async (_name, Layout) => {
      mockedReadAppRuntime.mockReturnValue("demo");

      await render(<Layout />);

      expect(screen.getByText("/(demo)")).toBeVisible();
      expect(mockedUseAuth).not.toHaveBeenCalled();
    },
  );

  it("redirects demo deep links to the production root", async () => {
    mockedReadAppRuntime.mockReturnValue("production");

    await render(<DemoLayout />);

    expect(screen.getByText("/")).toBeVisible();
  });
});
