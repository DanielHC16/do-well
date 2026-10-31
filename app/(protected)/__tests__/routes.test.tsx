import { render, screen, waitFor } from "@testing-library/react-native";

import { useAuth } from "@/features/auth/context/useAuth";
import { useShellMode } from "@/features/shell/context/useShellMode";

import ProtectedUnmatchedRoute from "../[...unmatched]";
import ActivityRoute from "../activity";
import EmployerHomeScreen from "../employer";
import EmployerAssignmentDetailRoute from "../employer/assignments/[assignmentId]";
import EmployerGigDetailRoute from "../employer/gigs/[gigId]";
import EmployerNewGigRoute from "../employer/gigs/new";
import ProtectedIndexRoute from "../index";
import ProfileRoute from "../profile";
import WorkerHomeScreen from "../worker";
import WorkerAssignmentDetailRoute from "../worker/assignments/[assignmentId]";
import WorkerGigDetailRoute from "../worker/gigs/[gigId]";
import WorkRoute from "../work";

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Text } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    useRouter: () => ({ push: mockPush, replace: mockReplace }),
    useFocusEffect: (effect: () => void) => React.useEffect(effect, [effect]),
    useLocalSearchParams: () => ({
      gigId: "test-gig-id",
      assignmentId: "test-assignment-id",
    }),
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
  ...jest.requireActual("@/features/auth/context/useAuth"),
  useAuth: jest.fn(),
}));

jest.mock("@/features/shell/context/useShellMode", () => ({
  useShellMode: jest.fn(),
}));

jest.mock("@/features/assignments/data/assignment-gateway", () => {
  const detail = {
    assignment: {
      id: "test-assignment-id",
      gigId: "test-gig-id",
      applicationId: "app-1",
      employerId: "user-test",
      workerId: "worker-1",
      agreementVersion: 1,
      agreedTitle: "Desk Assembly Agreement",
      agreedDescription: "Assemble 4 desks in room 101.",
      agreedAmount: 1500,
      currency: "PHP" as const,
      dueAt: null,
      status: "active" as const,
      employerConfirmedAt: "2026-10-25T01:00:00.000Z",
      workerConfirmedAt: "2026-10-25T01:10:00.000Z",
      startedAt: "2026-10-25T01:10:00.000Z",
      completedAt: null,
      cancelledAt: null,
      clientRequestId: "req-1",
      createdAt: "2026-10-25T01:00:00.000Z",
      updatedAt: "2026-10-25T01:10:00.000Z",
    },
    employer: {
      id: "user-test",
      displayName: "Jordan Lee",
      homeArea: "Quezon City",
    },
    worker: {
      id: "worker-1",
      displayName: "Warren Worker",
      homeArea: "Makati",
    },
    gig: {
      id: "test-gig-id",
      title: "Desk Assembly Agreement",
      category: "errands" as const,
      workMode: "onsite" as const,
      publicArea: "Quezon City",
    },
  };

  const gateway = {
    getAssignmentDetail: jest.fn(async () => detail),
    listMilestones: jest.fn(async () => []),
    confirmAssignment: jest.fn(),
    declineAssignment: jest.fn(),
    cancelProposedAssignment: jest.fn(),
    createMilestone: jest.fn(),
    startMilestone: jest.fn(),
    listUserActivity: jest.fn(async () => []),
    markActivityRead: jest.fn(),
  };

  return {
    assignmentGateway: gateway,
    getAssignmentGateway: () => gateway,
  };
});

jest.mock("@/features/applications/data/application-gateway", () => ({
  applicationGateway: {
    applyToGig: jest.fn(),
    withdrawApplication: jest.fn(),
    selectWorkerAtomic: jest.fn(),
    listGigApplicants: jest.fn(async () => []),
    getWorkerApplicationForGig: jest.fn(async () => null),
    getAssignmentForGig: jest.fn(async () => null),
  },
}));

jest.mock("@/features/discovery/data/discovery-gateway", () => ({
  discoveryGateway: {
    discoverGigs: jest.fn(async () => []),
    discoverGigsWithMetadata: jest.fn(async () => ({
      gigs: [],
      isFromCache: false,
      cachedAt: null,
    })),
    getPublicGig: jest.fn(async () => ({
      id: "test-gig-id",
      employerId: "employer-1",
      title: "Worker Route Gig",
      description: "Route test gig description for worker view.",
      category: "errands",
      workMode: "onsite",
      publicArea: "Quezon City",
      publicLatitude: 14.65,
      publicLongitude: 121.05,
      budgetAmount: 500,
      currency: "PHP",
      status: "published",
      distanceKm: 3.2,
      publishedAt: "2026-10-25T01:00:00.000Z",
      createdAt: "2026-10-25T00:00:00.000Z",
      reasons: ["Within 5 km of you"],
    })),
  },
}));

jest.mock("@/features/work/data/work-gateway", () => ({
  WORK_PAGE_SIZE: 20,
  workGateway: { list: jest.fn(async () => []) },
}));

jest.mock("@/features/profile/data/profile-editor-gateway", () => ({
  profileEditorGateway: {
    read: jest.fn(async () => ({
      id: "user-test",
      displayName: "Jordan Lee",
      homeArea: "Quezon City",
      bio: "",
    })),
    save: jest.fn(),
  },
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

jest.mock("@/features/submissions/data/submission-gateway", () => ({
  submissionGateway: {
    submitAssignmentWork: jest.fn(),
    requestSubmissionRevision: jest.fn(),
    approveAssignmentCompletion: jest.fn(),
    listAssignmentSubmissions: jest.fn(async () => []),
    getLatestAssignmentSubmission: jest.fn(async () => null),
  },
  getSubmissionGateway: () => ({
    submitAssignmentWork: jest.fn(),
    requestSubmissionRevision: jest.fn(),
    approveAssignmentCompletion: jest.fn(),
    listAssignmentSubmissions: jest.fn(async () => []),
    getLatestAssignmentSubmission: jest.fn(async () => null),
  }),
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
    expect(screen.getByRole("header", { name: "Discover gigs" })).toBeVisible();
    expect(screen.getByText("Hi, Jordan")).toBeVisible();
  });

  it("EmployerHomeScreen renders employer workspace", async () => {
    // The shell header and the employer route share one workspace mode.
    mockedUseShellMode.mockReturnValue({
      mode: "employer",
      busy: false,
      error: null,
      switchMode: jest.fn(async () => true),
      retry: jest.fn(async () => undefined),
    });
    await render(<EmployerHomeScreen />);
    expect(
      screen.getByRole("header", { name: "Your workspace" }),
    ).toBeVisible();
    expect(screen.getByText("Hi, Jordan")).toBeVisible();
  });

  it("EmployerNewGigRoute renders gig creation form", async () => {
    await render(<EmployerNewGigRoute />);
    expect(screen.getByText("Post a gig")).toBeVisible();
    expect(screen.getByText("Job brief assistant")).toBeVisible();
  });

  it("EmployerGigDetailRoute renders gig details screen", async () => {
    await render(<EmployerGigDetailRoute />);
    await waitFor(() => {
      expect(screen.getByText("Test Route Gig")).toBeVisible();
      expect(screen.getByText("STATUS: DRAFT")).toBeVisible();
    });
  });

  it("WorkerGigDetailRoute renders worker gig details screen", async () => {
    await render(<WorkerGigDetailRoute />);
    await waitFor(() => {
      expect(screen.getByText("Worker Route Gig")).toBeVisible();
      expect(screen.getByText("STATUS: PUBLISHED")).toBeVisible();
    });
  });

  it("WorkerAssignmentDetailRoute renders worker agreement details screen", async () => {
    await render(<WorkerAssignmentDetailRoute />);
    await waitFor(() => {
      expect(screen.getByText("Task agreement")).toBeVisible();
      expect(screen.getByText("Desk Assembly Agreement")).toBeVisible();
    });
  });

  it("EmployerAssignmentDetailRoute renders employer agreement and milestones screen", async () => {
    await render(<EmployerAssignmentDetailRoute />);
    await waitFor(() => {
      expect(screen.getByText("Assigned contract")).toBeVisible();
      expect(screen.getByText("Desk Assembly Agreement")).toBeVisible();
    });
  });

  it("ActivityRoute renders activity trail", async () => {
    await render(<ActivityRoute />);
    expect(screen.getByRole("header", { name: "Activity" })).toBeVisible();
  });

  it("ProfileRoute renders profile identity and sign-out", async () => {
    await render(<ProfileRoute />);
    expect(screen.getByText("Jordan Lee")).toBeVisible();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  it("WorkRoute renders applications within the authenticated shell", async () => {
    await render(<WorkRoute />);
    expect(await screen.findByText("No applications yet")).toBeVisible();
    expect(screen.getByRole("tab", { name: "My Work" })).toBeVisible();
  });

  it("ProtectedUnmatchedRoute renders fallback 404 notice", async () => {
    await render(<ProtectedUnmatchedRoute />);
    expect(screen.getByText("This notice is not posted.")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Return to workspace" }),
    ).toBeVisible();
  });
});
