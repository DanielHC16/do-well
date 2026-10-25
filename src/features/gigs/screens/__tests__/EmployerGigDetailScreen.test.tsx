import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import type { ApplicationGateway } from "@/features/applications/data/application-gateway";
import type {
  ApplicantSummary,
  AssignmentRecord,
} from "@/features/applications/model/application-schemas";

import type { GigGateway } from "../../data/gig-gateway";
import type { GigRecord } from "../../model/gig-schemas";
import { EmployerGigDetailScreen } from "../EmployerGigDetailScreen";

const mockReplace = jest.fn();

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockDraftGig: GigRecord = {
  id: "a0000000-0000-4000-8000-000000000001",
  employerId: "e0000000-0000-4000-8000-000000000001",
  title: "Yard Clearing and Grass Cutting",
  description: "Need help clearing 50sqm garden and disposing clippings.",
  category: "errands",
  workMode: "onsite",
  publicArea: "Poblacion, Makati",
  publicLatitude: 14.56,
  publicLongitude: 121.03,
  budgetAmount: 750,
  currency: "PHP",
  status: "draft",
  applicationDeadline: null,
  dueAt: null,
  publishedAt: null,
  closedAt: null,
  createdAt: "2026-10-25T00:00:00.000Z",
  updatedAt: "2026-10-25T00:00:00.000Z",
};

const mockPublishedGig: GigRecord = {
  ...mockDraftGig,
  id: "a0000000-0000-4000-8000-000000000002",
  status: "published",
  publishedAt: "2026-10-25T01:00:00.000Z",
};

const mockClosedGig: GigRecord = {
  ...mockDraftGig,
  id: "a0000000-0000-4000-8000-000000000003",
  status: "closed",
  publishedAt: "2026-10-25T01:00:00.000Z",
  closedAt: "2026-10-25T02:00:00.000Z",
};

const mockApplicant: ApplicantSummary = {
  id: "92000000-0000-4000-8000-000000000001",
  gigId: "a0000000-0000-4000-8000-000000000002",
  workerId: "90000000-0000-4000-8000-000000000002",
  message: "Experienced gardener with mower.",
  status: "pending",
  decidedAt: null,
  createdAt: "2026-10-25T01:00:00.000Z",
  workerDisplayName: "Warren Worker",
  workerHomeArea: "Makati",
};

const mockAssignment: AssignmentRecord = {
  id: "94000000-0000-4000-8000-000000000001",
  gigId: "a0000000-0000-4000-8000-000000000002",
  applicationId: "92000000-0000-4000-8000-000000000001",
  employerId: "e0000000-0000-4000-8000-000000000001",
  workerId: "90000000-0000-4000-8000-000000000002",
  agreementVersion: 1,
  agreedTitle: "Yard Clearing and Grass Cutting",
  agreedDescription: "Need help clearing 50sqm garden and disposing clippings.",
  agreedAmount: 750,
  currency: "PHP",
  dueAt: null,
  status: "proposed",
  employerConfirmedAt: "2026-10-25T01:00:00.000Z",
  workerConfirmedAt: null,
  startedAt: null,
  completedAt: null,
  cancelledAt: null,
  clientRequestId: "95000000-0000-4000-8000-000000000001",
  createdAt: "2026-10-25T01:00:00.000Z",
  updatedAt: "2026-10-25T01:00:00.000Z",
};

function createMockGateway(initialGig?: GigRecord | null): GigGateway {
  return {
    getGigById: jest.fn(async () => {
      if (initialGig === undefined) return mockDraftGig;
      if (initialGig === null) throw new Error("Gig notice not found.");
      return initialGig;
    }),
    createDraft: jest.fn(),
    updateDraft: jest.fn(),
    publishGig: jest.fn(async (id) => ({
      ...mockDraftGig,
      id,
      status: "published" as const,
      publishedAt: "2026-10-25T01:00:00.000Z",
    })),
    closeGig: jest.fn(async (id) => ({
      ...mockPublishedGig,
      id,
      status: "closed" as const,
      closedAt: "2026-10-25T02:00:00.000Z",
    })),
    listEmployerGigs: jest.fn(async () => []),
  };
}

function createMockApplicationGateway(
  applicants: ApplicantSummary[] = [],
  assignment: AssignmentRecord | null = null,
): ApplicationGateway {
  return {
    applyToGig: jest.fn(),
    withdrawApplication: jest.fn(),
    selectWorkerAtomic: jest.fn(async () => mockAssignment),
    listGigApplicants: jest.fn(async () => applicants),
    getWorkerApplicationForGig: jest.fn(async () => null),
    getAssignmentForGig: jest.fn(async () => assignment),
  };
}

describe("EmployerGigDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders draft notice details with publish action", async () => {
    const gateway = createMockGateway(mockDraftGig);
    const applications = createMockApplicationGateway();

    await render(
      <EmployerGigDetailScreen
        applications={applications}
        gateway={gateway}
        gigId="a0000000-0000-4000-8000-000000000001"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Yard Clearing and Grass Cutting")).toBeVisible();
    });

    expect(screen.getByText("STATUS: DRAFT")).toBeVisible();
    expect(screen.getByText("PHP 750")).toBeVisible();
    expect(screen.getByText("Poblacion, Makati")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Publish to Noticeboard" }),
    ).toBeVisible();
  });

  it("publishes a draft notice when publish button is pressed", async () => {
    const gateway = createMockGateway(mockDraftGig);
    const applications = createMockApplicationGateway();

    await render(
      <EmployerGigDetailScreen
        applications={applications}
        gateway={gateway}
        gigId="a0000000-0000-4000-8000-000000000001"
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Publish to Noticeboard" }),
      ).toBeVisible();
    });

    await fireEvent.press(
      screen.getByRole("button", { name: "Publish to Noticeboard" }),
    );

    await waitFor(() => {
      expect(gateway.publishGig).toHaveBeenCalledWith(
        "a0000000-0000-4000-8000-000000000001",
      );
      expect(screen.getByText("STATUS: PUBLISHED")).toBeVisible();
    });
  });

  it("renders published notice details and closes it when close button is pressed", async () => {
    const gateway = createMockGateway(mockPublishedGig);
    const applications = createMockApplicationGateway();

    await render(
      <EmployerGigDetailScreen
        applications={applications}
        gateway={gateway}
        gigId="a0000000-0000-4000-8000-000000000002"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("STATUS: PUBLISHED")).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Close Notice" }),
      ).toBeVisible();
    });

    await fireEvent.press(screen.getByRole("button", { name: "Close Notice" }));

    await waitFor(() => {
      expect(gateway.closeGig).toHaveBeenCalledWith(
        "a0000000-0000-4000-8000-000000000002",
      );
      expect(screen.getByText("STATUS: CLOSED")).toBeVisible();
    });
  });

  it("renders applicants list and allows selecting a worker atomically", async () => {
    const gateway = createMockGateway(mockPublishedGig);
    const applications = createMockApplicationGateway([mockApplicant]);

    await render(
      <EmployerGigDetailScreen
        applications={applications}
        gateway={gateway}
        gigId="a0000000-0000-4000-8000-000000000002"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("APPLICANTS (1)")).toBeVisible();
      expect(screen.getByText("Warren Worker")).toBeVisible();
      expect(
        screen.getByText(/"Experienced gardener with mower."/),
      ).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Select Warren Worker" }),
      ).toBeVisible();
    });

    await fireEvent.press(
      screen.getByRole("button", { name: "Select Warren Worker" }),
    );

    await waitFor(() => {
      expect(applications.selectWorkerAtomic).toHaveBeenCalledWith({
        applicationId: mockApplicant.id,
      });
      expect(
        screen.getByText("Worker selected! Agreement proposed successfully."),
      ).toBeVisible();
    });
  });

  it("renders closed notice state with terminal notice banner and assignment if present", async () => {
    const gateway = createMockGateway(mockClosedGig);
    const applications = createMockApplicationGateway([], mockAssignment);

    await render(
      <EmployerGigDetailScreen
        applications={applications}
        gateway={gateway}
        gigId="a0000000-0000-4000-8000-000000000003"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("STATUS: CLOSED")).toBeVisible();
      expect(screen.getByText("ACTIVE ASSIGNMENT")).toBeVisible();
      expect(
        screen.getByText(
          "Awaiting worker confirmation to begin work (Coming in M08).",
        ),
      ).toBeVisible();
      expect(
        screen.getByText(
          "This notice is closed and no longer visible on the noticeboard.",
        ),
      ).toBeVisible();
    });
    expect(
      screen.queryByRole("button", { name: "Publish to Noticeboard" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Close Notice" })).toBeNull();
  });

  it("renders error state when gig loading fails and allows returning to workspace", async () => {
    const gateway = createMockGateway(null);

    await render(
      <EmployerGigDetailScreen gateway={gateway} gigId="gig-missing" />,
    );

    await waitFor(() => {
      expect(screen.getByText("NOTICE UNAVAILABLE")).toBeVisible();
      expect(screen.getByText("Gig notice not found.")).toBeVisible();
    });

    await fireEvent.press(
      screen.getByRole("button", { name: "Return to workspace" }),
    );
    expect(mockReplace).toHaveBeenCalledWith("/(protected)/employer");
  });
});
