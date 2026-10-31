import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { ApplicationGateway } from "@/features/applications/data/application-gateway";
import type { ApplicationRecord } from "@/features/applications/model/application-schemas";

import type { DiscoveryGateway } from "../../data/discovery-gateway";
import type { DiscoveryGigCard } from "../../model/discovery-schemas";
import { WorkerGigDetailScreen } from "../WorkerGigDetailScreen";

const mockReplace = jest.fn();

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockGig: DiscoveryGigCard = {
  id: "81000000-0000-4000-8000-000000000001",
  employerId: "80000000-0000-4000-8000-000000000001",
  title: "Makati House Deep Cleaning",
  description:
    "Deep clean master bedroom, kitchen counters, and mop living room tile floor.",
  category: "cleaning",
  workMode: "onsite",
  publicArea: "Poblacion, Makati",
  publicLatitude: 14.5547,
  publicLongitude: 121.0244,
  budgetAmount: 1200,
  currency: "PHP",
  status: "published",
  distanceKm: 2.8,
  publishedAt: "2026-10-25T01:00:00.000Z",
  createdAt: "2026-10-25T00:00:00.000Z",
  reasons: ["Within 5 km of you", "Recently posted"],
};

const mockPendingApplication: ApplicationRecord = {
  id: "92000000-0000-4000-8000-000000000001",
  gigId: "81000000-0000-4000-8000-000000000001",
  workerId: "90000000-0000-4000-8000-000000000002",
  message: "I have 3 years cleaning experience.",
  status: "pending",
  clientRequestId: "93000000-0000-4000-8000-000000000001",
  decidedAt: null,
  createdAt: "2026-10-25T01:00:00.000Z",
  updatedAt: "2026-10-25T01:00:00.000Z",
};

jest.mock("@/features/applications/data/application-gateway", () => ({
  applicationGateway: {
    applyToGig: jest.fn(async () => mockPendingApplication),
    withdrawApplication: jest.fn(async () => ({
      ...mockPendingApplication,
      status: "withdrawn" as const,
    })),
    selectWorkerAtomic: jest.fn(),
    listGigApplicants: jest.fn(async () => []),
    getWorkerApplicationForGig: jest.fn(async () => null),
    getAssignmentForGig: jest.fn(async () => null),
  },
}));

function createMockGateway(
  gig: DiscoveryGigCard | null = mockGig,
): DiscoveryGateway {
  return {
    discoverGigs: jest.fn(async () => []),
    discoverGigsWithMetadata: jest.fn(async () => ({
      gigs: [],
      isFromCache: false,
      cachedAt: null,
    })),
    getPublicGig: jest.fn(async () => gig),
  };
}

function createMockApplicationGateway(
  initialApp: ApplicationRecord | null = null,
): ApplicationGateway {
  return {
    applyToGig: jest.fn(async () => mockPendingApplication),
    withdrawApplication: jest.fn(async () => ({
      ...mockPendingApplication,
      status: "withdrawn" as const,
    })),
    selectWorkerAtomic: jest.fn(),
    listGigApplicants: jest.fn(async () => []),
    getWorkerApplicationForGig: jest.fn(async () => initialApp),
    getAssignmentForGig: jest.fn(async () => null),
  };
}

describe("WorkerGigDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a real employer identity when available and an honest fallback otherwise", async () => {
    const view = await render(
      <WorkerGigDetailScreen
        gateway={createMockGateway({
          ...mockGig,
          employerDisplayName: "Maya Santos",
        })}
        gigId={mockGig.id}
      />,
    );
    await waitFor(() => expect(view.getByText("Maya Santos")).toBeVisible());
    expect(view.queryByText("Employer profile unavailable")).toBeNull();
    await view.rerender(
      <WorkerGigDetailScreen
        gateway={createMockGateway(mockGig)}
        gigId={mockGig.id}
      />,
    );
    await waitFor(() =>
      expect(view.getByText("Employer profile unavailable")).toBeVisible(),
    );
    expect(view.queryByText("Maya Santos")).toBeNull();
  });

  it("shows related closed gigs and their accepted application without allowing a new application", async () => {
    const applications = createMockApplicationGateway({
      ...mockPendingApplication,
      status: "accepted",
    });
    const view = await render(
      <WorkerGigDetailScreen
        applications={applications}
        gateway={createMockGateway({ ...mockGig, status: "closed" })}
        gigId={mockGig.id}
      />,
    );
    await waitFor(() => expect(view.getByText("STATUS: CLOSED")).toBeVisible());
    expect(view.getByText("Accepted")).toBeVisible();
    expect(
      view.queryByRole("button", { name: "Submit Application" }),
    ).toBeNull();
  });

  it("does not offer Apply when a visible gig is no longer published", async () => {
    const view = await render(
      <WorkerGigDetailScreen
        gateway={createMockGateway({ ...mockGig, status: "closed" })}
        gigId={mockGig.id}
      />,
    );
    await waitFor(() =>
      expect(
        view.getByText("Applications are closed for this gig."),
      ).toBeVisible(),
    );
    expect(
      view.queryByRole("button", { name: "Submit Application" }),
    ).toBeNull();
  });

  it("shows supplied deadlines in Philippine time without inventing absent schedule data", async () => {
    const gateway = createMockGateway({
      ...mockGig,
      applicationDeadline: "2026-11-01T09:00:00.000Z",
      dueAt: "2026-11-02T09:00:00.000Z",
    });
    const view = await render(
      <WorkerGigDetailScreen gateway={gateway} gigId={mockGig.id} />,
    );
    await waitFor(() =>
      expect(view.getByText("Application deadline")).toBeVisible(),
    );
    expect(view.getByText(/Nov 1, 2026/)).toBeVisible();
    expect(view.getByText(/Nov 2, 2026/)).toBeVisible();
    expect(view.getByText("Philippine time (UTC+8)")).toBeVisible();
  });

  it("keeps Apply unavailable when application status cannot be read and retries safely", async () => {
    const gateway = createMockGateway(mockGig);
    const applications = createMockApplicationGateway(mockPendingApplication);
    jest
      .mocked(applications.getWorkerApplicationForGig)
      .mockRejectedValueOnce(new Error("private provider failure"));
    const view = await render(
      <WorkerGigDetailScreen
        applications={applications}
        gateway={gateway}
        gigId={mockGig.id}
      />,
    );
    await waitFor(() =>
      expect(view.getByText("Notice unavailable")).toBeVisible(),
    );
    expect(
      view.queryByRole("button", { name: "Submit Application" }),
    ).toBeNull();
    expect(view.queryByText("private provider failure")).toBeNull();
    await fireEvent.press(view.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(view.getByText("Pending review")).toBeVisible());
    expect(
      view.queryByRole("button", { name: "Submit Application" }),
    ).toBeNull();
  });

  it("renders public gig notice details, reasons, and application form", async () => {
    const gateway = createMockGateway(mockGig);
    const applications = createMockApplicationGateway(null);

    const view = await render(
      <WorkerGigDetailScreen
        applications={applications}
        gateway={gateway}
        gigId="81000000-0000-4000-8000-000000000001"
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Makati House Deep Cleaning")).toBeVisible();
    });

    expect(view.getByText("₱1,200")).toBeVisible();
    expect(view.getByText(/Poblacion, Makati/)).toBeVisible();
    expect(view.getByText("Within 5 km of you")).toBeVisible();
    expect(view.getByText("Recently posted")).toBeVisible();
    expect(view.getByText("Apply for this gig")).toBeVisible();
    expect(
      view.getByRole("button", { name: "Submit Application" }),
    ).toBeVisible();
  });

  it("submits application and displays pending review status", async () => {
    const gateway = createMockGateway(mockGig);
    const applications = createMockApplicationGateway(null);

    const view = await render(
      <WorkerGigDetailScreen
        applications={applications}
        gateway={gateway}
        gigId="81000000-0000-4000-8000-000000000001"
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Apply for this gig")).toBeVisible();
    });

    const input = view.getByLabelText("Qualifications or availability note");
    await fireEvent.changeText(input, "Available early morning.");

    await fireEvent.press(
      view.getByRole("button", { name: "Submit Application" }),
    );

    await waitFor(() => {
      expect(applications.applyToGig).toHaveBeenCalledWith({
        gigId: "81000000-0000-4000-8000-000000000001",
        message: "Available early morning.",
      });
      expect(view.getByText("Pending review")).toBeVisible();
      expect(
        view.getByRole("button", { name: "Withdraw Application" }),
      ).toBeVisible();
    });
  });

  it("allows withdrawing a pending application", async () => {
    const gateway = createMockGateway(mockGig);
    const applications = createMockApplicationGateway(mockPendingApplication);

    const view = await render(
      <WorkerGigDetailScreen
        applications={applications}
        gateway={gateway}
        gigId="81000000-0000-4000-8000-000000000001"
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Pending review")).toBeVisible();
      expect(
        view.getByText(/"I have 3 years cleaning experience."/),
      ).toBeVisible();
    });

    await fireEvent.press(
      view.getByRole("button", { name: "Withdraw Application" }),
    );

    await waitFor(() => {
      expect(applications.withdrawApplication).toHaveBeenCalledWith(
        mockPendingApplication.id,
      );
      expect(view.getByText("Previously withdrawn")).toBeVisible();
      expect(
        view.getByRole("button", { name: "Submit Application" }),
      ).toBeVisible();
    });
  });

  it("renders error state when gig is missing or unpublished", async () => {
    const gateway = createMockGateway(null);

    const view = await render(
      <WorkerGigDetailScreen gateway={gateway} gigId="missing-id" />,
    );

    await waitFor(() => {
      expect(view.getByText("Notice unavailable")).toBeVisible();
      expect(
        view.getByText("Notice not found or no longer available."),
      ).toBeVisible();
    });
  });
});
