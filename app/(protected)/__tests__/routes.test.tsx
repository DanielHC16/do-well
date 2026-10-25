import { render, screen, waitFor } from "@testing-library/react-native";

import { useAuth } from "@/features/auth/context/useAuth";
import { useShellMode } from "@/features/shell/context/useShellMode";

import ProtectedUnmatchedRoute from "../[...unmatched]";
import ActivityRoute from "../activity";
import EmployerHomeScreen from "../employer";
import EmployerGigDetailRoute from "../employer/gigs/[gigId]";
import EmployerNewGigRoute from "../employer/gigs/new";
import ProtectedIndexRoute from "../index";
import ProfileRoute from "../profile";
import WorkerHomeScreen from "../worker";

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Text } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    useRouter: () => ({ push: mockPush, replace: mockReplace }),
    useLocalSearchParams: () => ({ gigId: "test-gig-id" }),
    Redirect: ({ href }: { href: string }) =>
      React.createElement(Text, null, `Redirected to ${href}`),
  };
});

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

jest.mock("@/features/auth/context/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/features/shell/context/useShellMode", () => ({
  useShellMode: jest.fn(),
}));

jest.mock("@/features/gigs/data/gig-gateway", () => ({
  gigGateway: {
    getGigById: jest.fn(async () => ({
      id: "test-gig-id",
      employerId: "user-test",
      title: "Test Route Gig",
      description: "Route test gig description.",
      category: "errands",
      workMode: "onsite",
      publicArea: "Quezon City",
      publicLatitude: 14.65,
      publicLongitude: 121.05,
      budgetAmount: 600,
      currency: "PHP",
      status: "draft",
      applicationDeadline: null,
      dueAt: null,
      publishedAt: null,
      closedAt: null,
      createdAt: "2026-10-25T00:00:00.000Z",
      updatedAt: "2026-10-25T00:00:00.000Z",
    })),
    listEmployerGigs: jest.fn(async () => []),
    createDraft: jest.fn(),
    publishGig: jest.fn(),
    closeGig: jest.fn(),
  },
}));

const mockedUseAuth = jest.mocked(useAuth);
const mockedUseShellMode = jest.mocked(useShellMode);

const mockProfile = {
  id: "user-test",
  displayName: "Jordan Lee",
  homeArea: "Quezon City",
  onboardingCompletedAt: "2026-10-25T00:00:00.000Z",
};

describe("Protected route components", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      state: {
        route: "ready",
        status: "idle",
        userId: "user-test",
        profile: mockProfile,
        error: null,
        operationId: 1,
      },
      signOut: jest.fn(async () => undefined),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      beginGoogleSignIn: jest.fn(),
      exchangeCode: jest.fn(),
      resendConfirmation: jest.fn(),
      requestPasswordReset: jest.fn(),
      updatePassword: jest.fn(),
      completeOnboarding: jest.fn(),
      refresh: jest.fn(),
    });
    mockedUseShellMode.mockReturnValue({
      mode: "worker",
      busy: false,
      error: null,
      switchMode: jest.fn(async () => true),
      retry: jest.fn(async () => undefined),
    });
  });

  it("ProtectedIndexRoute redirects to active worker route", async () => {
    mockedUseShellMode.mockReturnValueOnce({
      mode: "worker",
      busy: false,
      error: null,
      switchMode: jest.fn(async () => true),
      retry: jest.fn(async () => undefined),
    });

    await render(<ProtectedIndexRoute />);
    expect(screen.getByText("Redirected to /(protected)/worker")).toBeVisible();
  });

  it("ProtectedIndexRoute redirects to active employer route", async () => {
    mockedUseShellMode.mockReturnValueOnce({
      mode: "employer",
      busy: false,
      error: null,
      switchMode: jest.fn(async () => true),
      retry: jest.fn(async () => undefined),
    });

    await render(<ProtectedIndexRoute />);
    expect(
      screen.getByText("Redirected to /(protected)/employer"),
    ).toBeVisible();
  });

  it("WorkerHomeScreen renders worker workspace", async () => {
    await render(<WorkerHomeScreen />);
    expect(screen.getByText("Good work starts nearby.")).toBeVisible();
    expect(screen.getByText("Jordan Lee")).toBeVisible();
  });

  it("EmployerHomeScreen renders employer workspace", async () => {
    await render(<EmployerHomeScreen />);
    expect(screen.getByText("Put useful work in motion.")).toBeVisible();
    expect(screen.getByText("Jordan Lee")).toBeVisible();
  });

  it("EmployerNewGigRoute renders gig creation form", async () => {
    await render(<EmployerNewGigRoute />);
    expect(screen.getByText("POST A GIG")).toBeVisible();
    expect(screen.getByText("AI JOB BRIEF BUILDER")).toBeVisible();
  });

  it("EmployerGigDetailRoute renders gig details screen", async () => {
    await render(<EmployerGigDetailRoute />);
    await waitFor(() => {
      expect(screen.getByText("Test Route Gig")).toBeVisible();
      expect(screen.getByText("STATUS: DRAFT")).toBeVisible();
    });
  });

  it("ActivityRoute renders activity trail", async () => {
    await render(<ActivityRoute />);
    expect(screen.getByText("Nothing gets lost in the handoff.")).toBeVisible();
  });

  it("ProfileRoute renders profile identity and sign-out", async () => {
    await render(<ProfileRoute />);
    expect(screen.getByText("Jordan Lee")).toBeVisible();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  it("ProtectedUnmatchedRoute renders fallback 404 notice", async () => {
    await render(<ProtectedUnmatchedRoute />);
    expect(screen.getByText("This notice is not posted.")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Return to workspace" }),
    ).toBeVisible();
  });
});
