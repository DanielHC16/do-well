import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { AuthProfile } from "@/features/auth/model/auth-state";
import type { DiscoveryGateway } from "@/features/discovery/data/discovery-gateway";
import type { DiscoveryGigCard } from "@/features/discovery/model/discovery-schemas";
import type { GigGateway } from "@/features/gigs/data/gig-gateway";
import type { ApplicantSummary } from "@/features/applications/model/application-schemas";
import type { GigRecord } from "@/features/gigs/model/gig-schemas";
import type { HomeStatsSources } from "@/features/shell/data/home-stats";
import type { WorkItem } from "@/features/work/data/work-gateway";
import type { LocationService } from "@/features/location";

import { AuthenticatedHomeScreen } from "../AuthenticatedHomeScreen";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSwitchMode = jest.fn(async () => true);

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

let mockShellMode: "worker" | "employer" = "worker";
jest.mock("@/features/shell/context/useShellMode", () => ({
  useShellMode: () => ({
    mode: mockShellMode,
    busy: false,
    error: null,
    switchMode: mockSwitchMode,
    retry: jest.fn(async () => undefined),
  }),
}));

jest.mock("@/features/discovery/data/discovery-gateway", () => ({
  discoveryGateway: {
    discoverGigs: jest.fn(async () => []),
    getPublicGig: jest.fn(async () => null),
  },
}));

jest.mock("@/features/gigs/data/gig-gateway", () => ({
  gigGateway: {
    createDraft: jest.fn(),
    updateDraft: jest.fn(),
    publishGig: jest.fn(),
    closeGig: jest.fn(),
    getGigById: jest.fn(),
    listEmployerGigs: jest.fn(async () => []),
  },
}));

const profile: AuthProfile = {
  id: "e0000000-0000-4000-8000-000000000001",
  displayName: "Ari Santos",
  homeArea: "Makati",
  onboardingCompletedAt: "2026-10-25T00:00:00.000Z",
};

const sampleEmployerGigs: GigRecord[] = [
  {
    id: "a0000000-0000-4000-8000-000000000001",
    employerId: "e0000000-0000-4000-8000-000000000001",
    title: "Neighborhood House Cleaning",
    description: "Detailed cleaning for two bedroom apartment.",
    category: "cleaning",
    workMode: "onsite",
    publicArea: "Makati",
    publicLatitude: 14.56,
    publicLongitude: 121.03,
    budgetAmount: 1200,
    currency: "PHP",
    status: "published",
    applicationDeadline: null,
    dueAt: null,
    publishedAt: "2026-10-25T01:00:00.000Z",
    closedAt: null,
    createdAt: "2026-10-25T00:00:00.000Z",
    updatedAt: "2026-10-25T01:00:00.000Z",
  },
];

const sampleDiscoveryGigs: DiscoveryGigCard[] = [
  {
    id: "b0000000-0000-4000-8000-000000000001",
    employerId: "e0000000-0000-4000-8000-000000000002",
    title: "Grocery Delivery from Market",
    description: "Pick up fresh vegetables and fruits from Poblacion market.",
    category: "delivery",
    workMode: "onsite",
    publicArea: "Poblacion, Makati",
    publicLatitude: 14.56,
    publicLongitude: 121.03,
    budgetAmount: 450,
    currency: "PHP",
    status: "published",
    distanceKm: 1.5,
    publishedAt: "2026-10-25T01:00:00.000Z",
    createdAt: "2026-10-25T00:00:00.000Z",
    reasons: ["Within 5 km of you", "Recently posted"],
  },
];

function createMockGigGateway(gigs: GigRecord[] = []): GigGateway {
  return {
    createDraft: jest.fn(),
    updateDraft: jest.fn(),
    publishGig: jest.fn(),
    closeGig: jest.fn(),
    getGigById: jest.fn(),
    listEmployerGigs: jest.fn(async () => gigs),
  };
}

function createMockDiscoveryGateway(
  gigs: DiscoveryGigCard[] = [],
): DiscoveryGateway {
  return {
    discoverGigs: jest.fn(async () => gigs),
    discoverGigsWithMetadata: jest.fn(async () => ({
      gigs,
      isFromCache: false,
      cachedAt: null,
    })),
    getPublicGig: jest.fn(async () => null),
  };
}

function createMockStats(
  overrides: Partial<{
    work: WorkItem[];
    applicants: ApplicantSummary["status"][];
  }> = {},
): HomeStatsSources {
  return {
    pageSize: 20,
    work: { list: jest.fn(async () => overrides.work ?? []) },
    applicants: {
      listGigApplicants: jest.fn(async () =>
        (overrides.applicants ?? []).map(
          (status) => ({ status }) as ApplicantSummary,
        ),
      ),
    },
  };
}

function createMockLocationService(
  overrides: Partial<LocationService> = {},
): LocationService {
  return {
    checkPermission: jest.fn().mockResolvedValue("granted"),
    requestPermission: jest.fn().mockResolvedValue("granted"),
    getCurrentPosition: jest.fn().mockResolvedValue({
      latitude: 14.5547,
      longitude: 121.0244,
      accuracy: 15,
      timestamp: 1729864800000,
    }),
    isLocationServicesEnabled: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("AuthenticatedHomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShellMode = "worker";
  });

  it("keeps discovery loading distinct from an empty result", async () => {
    const discovery = createMockDiscoveryGateway();
    jest
      .mocked(discovery.discoverGigsWithMetadata)
      .mockReturnValueOnce(new Promise(() => {}));
    const view = await render(
      <AuthenticatedHomeScreen
        discovery={discovery}
        mode="worker"
        profile={profile}
      />,
    );
    expect(view.getByLabelText("Finding gigs")).toBeBusy();
    expect(view.queryByText("No gigs here yet")).toBeNull();
    expect(view.getAllByRole("header", { name: "Discover gigs" })).toHaveLength(
      1,
    );
    expect(view.queryByText("Flexible gigs nearby and online.")).toBeNull();
  });

  it("shows real employer counts in the header tiles and keeps worker discovery controls out", async () => {
    const gateway = createMockGigGateway([
      sampleEmployerGigs[0],
      {
        ...sampleEmployerGigs[0],
        id: "a0000000-0000-4000-8000-000000000002",
        status: "draft",
      },
    ]);
    mockShellMode = "employer";
    const stats = createMockStats({ applicants: ["pending", "rejected"] });
    const view = await render(
      <AuthenticatedHomeScreen
        gateway={gateway}
        mode="employer"
        profile={profile}
        stats={stats}
      />,
    );
    await waitFor(() =>
      expect(
        view.getByRole("button", { name: "1 Active posts" }),
      ).toBeVisible(),
    );
    expect(view.getByRole("button", { name: "1 Applicants" })).toBeVisible();
    expect(view.getByRole("button", { name: "0 In progress" })).toBeVisible();
    expect(stats.applicants.listGigApplicants).toHaveBeenCalledWith(
      sampleEmployerGigs[0].id,
    );
    expect(view.getByRole("header", { name: "Your workspace" })).toBeVisible();
    expect(view.queryByLabelText("Location and radius filter")).toBeNull();
    expect(view.queryByRole("button", { name: "Remote" })).toBeNull();
  });

  it("loads another page of gigs without discarding the first page", async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) => ({
      ...sampleDiscoveryGigs[0],
      id: `b0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      title: `Delivery gig ${index + 1}`,
    }));
    const discovery = createMockDiscoveryGateway(firstPage);
    jest
      .mocked(discovery.discoverGigsWithMetadata)
      .mockResolvedValueOnce({
        gigs: firstPage,
        isFromCache: false,
        cachedAt: null,
      })
      .mockResolvedValueOnce({
        gigs: [
          {
            ...sampleDiscoveryGigs[0],
            id: "b0000000-0000-4000-8000-000000000021",
            title: "Next page gig",
          },
        ],
        isFromCache: false,
        cachedAt: null,
      });
    const view = await render(
      <AuthenticatedHomeScreen
        discovery={discovery}
        mode="worker"
        profile={profile}
      />,
    );
    await waitFor(() =>
      expect(
        view.getByRole("button", { name: "Load more gigs" }),
      ).toBeVisible(),
    );
    await fireEvent.press(view.getByRole("button", { name: "Load more gigs" }));
    await waitFor(() =>
      expect(discovery.discoverGigsWithMetadata).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 20, limit: 20 }),
        profile.id,
      ),
    );
    expect(view.getByText("Delivery gig 1")).toBeVisible();
  });

  it("submits search through the existing discovery contract", async () => {
    const discovery = createMockDiscoveryGateway(sampleDiscoveryGigs);
    const view = await render(
      <AuthenticatedHomeScreen
        discovery={discovery}
        mode="worker"
        profile={profile}
      />,
    );
    await fireEvent.changeText(
      view.getByLabelText("Search gigs"),
      "  delivery  ",
    );
    await fireEvent(view.getByLabelText("Search gigs"), "submitEditing");
    await waitFor(() =>
      expect(discovery.discoverGigsWithMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({ searchQuery: "delivery" }),
        }),
        profile.id,
      ),
    );
  });

  it("shows a retryable discovery failure rather than an empty result", async () => {
    const discovery = createMockDiscoveryGateway(sampleDiscoveryGigs);
    jest
      .mocked(discovery.discoverGigsWithMetadata)
      .mockRejectedValueOnce(new Error("private vendor details"));
    const view = await render(
      <AuthenticatedHomeScreen
        discovery={discovery}
        mode="worker"
        profile={profile}
      />,
    );
    await waitFor(() =>
      expect(
        view.getByText(
          "We couldn't load gigs. Check your connection and try again.",
        ),
      ).toBeVisible(),
    );
    expect(view.queryByText("No gigs found")).toBeNull();
    expect(view.queryByText("private vendor details")).toBeNull();
    await fireEvent.press(view.getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(view.getByText("Grocery Delivery from Market")).toBeVisible(),
    );
  });

  it("shows employer load failures without suggesting there are no listings", async () => {
    const gateway = createMockGigGateway();
    jest
      .mocked(gateway.listEmployerGigs)
      .mockRejectedValueOnce(new Error("failed"));
    const view = await render(
      <AuthenticatedHomeScreen
        gateway={gateway}
        mode="employer"
        profile={profile}
      />,
    );
    await waitFor(() =>
      expect(
        view.getByText(
          "We couldn't load your listings. Check your connection and try again.",
        ),
      ).toBeVisible(),
    );
    expect(view.queryByText("No listings yet")).toBeNull();
  });

  it("renders worker discovery feed with notice card and reason tags", async () => {
    const discovery = createMockDiscoveryGateway(sampleDiscoveryGigs);

    const view = await render(
      <AuthenticatedHomeScreen
        discovery={discovery}
        mode="worker"
        profile={profile}
      />,
    );

    await waitFor(() => {
      expect(view.getByRole("header", { name: "1 gig" })).toBeVisible();
      expect(view.getByText("Grocery Delivery from Market")).toBeVisible();
      expect(view.getByText("₱450")).toBeVisible();
      expect(view.getByText(/1\.5 km/)).toBeVisible();
      expect(
        view.getByText("Why this fits: Within 5 km of you · Recently posted"),
      ).toBeVisible();
    });
  });

  it("filters by on-site work without claiming proximity before an area is selected", async () => {
    const discovery = createMockDiscoveryGateway(sampleDiscoveryGigs);

    const view = await render(
      <AuthenticatedHomeScreen
        discovery={discovery}
        mode="worker"
        profile={profile}
      />,
    );

    await waitFor(() => {
      expect(view.getByRole("header", { name: "1 gig" })).toBeVisible();
    });

    expect(view.queryByRole("button", { name: "Nearby" })).toBeNull();
    // No area chosen: the heading must not claim proximity.
    expect(view.queryByText(/near you/)).toBeNull();
    await fireEvent.press(view.getByRole("button", { name: "On-site" }));
    await waitFor(() =>
      expect(discovery.discoverGigsWithMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({ workMode: "onsite" }),
          workerLatitude: null,
          workerLongitude: null,
        }),
        profile.id,
      ),
    );
    await fireEvent.press(view.getByRole("button", { name: "Remote" }));

    await waitFor(() => {
      expect(discovery.discoverGigsWithMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({ workMode: "remote" }),
        }),
        profile.id,
      );
    });
  });

  it("navigates to worker gig detail when notice card is pressed", async () => {
    const discovery = createMockDiscoveryGateway(sampleDiscoveryGigs);

    const view = await render(
      <AuthenticatedHomeScreen
        discovery={discovery}
        mode="worker"
        profile={profile}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Grocery Delivery from Market")).toBeVisible();
    });

    await fireEvent.press(
      view.getByRole("button", {
        name: /Grocery Delivery from Market/,
      }),
    );

    expect(mockPush).toHaveBeenCalledWith(
      "/(protected)/worker/gigs/b0000000-0000-4000-8000-000000000001",
    );
  });

  it("shows worker tiles from real reads and a true zero for shortlisted", async () => {
    const stats = createMockStats();
    const view = await render(
      <AuthenticatedHomeScreen
        discovery={createMockDiscoveryGateway([])}
        mode="worker"
        profile={profile}
        stats={stats}
      />,
    );
    await waitFor(() =>
      expect(view.getByRole("button", { name: "0 Applied" })).toBeEnabled(),
    );
    expect(view.getByRole("button", { name: "0 Shortlisted" })).toBeDisabled();
    await fireEvent.press(view.getByRole("button", { name: "0 Applied" }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(protected)/work",
      params: { section: "applications" },
    });
  });

  it("offers reset and remote browsing from a compact empty state", async () => {
    const discovery = createMockDiscoveryGateway([]);
    const view = await render(
      <AuthenticatedHomeScreen
        discovery={discovery}
        mode="worker"
        profile={profile}
        stats={createMockStats()}
      />,
    );
    await waitFor(() =>
      expect(view.getByText("No gigs here yet")).toBeVisible(),
    );
    await fireEvent.press(view.getByRole("button", { name: "Browse remote" }));
    await waitFor(() =>
      expect(discovery.discoverGigsWithMetadata).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({ workMode: "remote" }),
        }),
        profile.id,
      ),
    );
  });

  it("applies the center-button remote intent once", async () => {
    const discovery = createMockDiscoveryGateway([]);
    await render(
      <AuthenticatedHomeScreen
        discovery={discovery}
        mode="worker"
        profile={profile}
        stats={createMockStats()}
        intent={{ kind: "remote", at: "1" }}
      />,
    );
    await waitFor(() =>
      expect(discovery.discoverGigsWithMetadata).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({ workMode: "remote" }),
        }),
        profile.id,
      ),
    );
  });

  it("filters by category from the filter sheet", async () => {
    const discovery = createMockDiscoveryGateway(sampleDiscoveryGigs);
    const view = await render(
      <AuthenticatedHomeScreen
        discovery={discovery}
        mode="worker"
        profile={profile}
        stats={createMockStats()}
      />,
    );
    await fireEvent.press(view.getByRole("button", { name: "Filters" }));
    await fireEvent.press(view.getByRole("button", { name: "Local Delivery" }));
    await waitFor(() =>
      expect(discovery.discoverGigsWithMetadata).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({ category: "delivery" }),
        }),
        profile.id,
      ),
    );
    expect(
      view.getByText(/Set your area first to filter by distance/),
    ).toBeVisible();
  });

  it("switches presentation mode and replaces the workspace route", async () => {
    const discovery = createMockDiscoveryGateway([]);
    const view = await render(
      <AuthenticatedHomeScreen
        discovery={discovery}
        mode="worker"
        profile={profile}
      />,
    );

    await fireEvent.press(
      view.getByRole("radio", { name: "Show employer workspace" }),
    );

    await waitFor(() =>
      expect(mockSwitchMode).toHaveBeenCalledWith("employer"),
    );
    expect(mockReplace).toHaveBeenCalledWith("/(protected)/employer");
  });

  it("renders employer workspace empty state and links to gig creation", async () => {
    const gateway = createMockGigGateway([]);
    const view = await render(
      <AuthenticatedHomeScreen
        gateway={gateway}
        mode="employer"
        profile={profile}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Post your first gig")).toBeVisible();
    });

    // Both the empty-state action and the center button open the builder.
    const actions = view.getAllByRole("button", { name: "Post a gig" });
    await fireEvent.press(actions[0]);
    expect(mockPush).toHaveBeenCalledWith("/(protected)/employer/gigs/new");
  });

  it("renders employer posted notices and links to detail screen", async () => {
    const gateway = createMockGigGateway(sampleEmployerGigs);
    const view = await render(
      <AuthenticatedHomeScreen
        gateway={gateway}
        mode="employer"
        profile={profile}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Neighborhood House Cleaning")).toBeVisible();
      expect(view.getByText("₱1,200")).toBeVisible();
      expect(view.getByLabelText("Status: Open")).toBeVisible();
    });

    await fireEvent.press(
      view.getByRole("button", {
        name: /Neighborhood House Cleaning/,
      }),
    );
    expect(mockPush).toHaveBeenCalledWith(
      "/(protected)/employer/gigs/a0000000-0000-4000-8000-000000000001",
    );
  });

  it("allows worker to select a manual locality and queries discovery with coordinates", async () => {
    const discovery = createMockDiscoveryGateway(sampleDiscoveryGigs);
    const location = createMockLocationService();

    const view = await render(
      <AuthenticatedHomeScreen
        discovery={discovery}
        location={location}
        mode="worker"
        profile={profile}
      />,
    );

    await waitFor(() => {
      expect(view.getByLabelText("Location and radius filter")).toBeVisible();
    });

    await fireEvent.press(view.getByLabelText("Location and radius filter"));

    await waitFor(() => {
      expect(view.getByText("Location & Radius")).toBeVisible();
    });

    await fireEvent.press(view.getByText("Bonifacio Global City"));

    await waitFor(() => {
      expect(discovery.discoverGigsWithMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          workerLatitude: 14.5492,
          workerLongitude: 121.0509,
        }),
        profile.id,
      );
      expect(view.getByText("Bonifacio Global City")).toBeVisible();
      expect(view.queryByText("MANUAL LOCALITY")).toBeNull();
    });
  });

  it("allows worker to acquire GPS location and queries discovery with coordinates", async () => {
    const discovery = createMockDiscoveryGateway(sampleDiscoveryGigs);
    const location = createMockLocationService();

    const view = await render(
      <AuthenticatedHomeScreen
        discovery={discovery}
        location={location}
        mode="worker"
        profile={profile}
      />,
    );

    await waitFor(() => {
      expect(view.getByLabelText("Location and radius filter")).toBeVisible();
    });

    await fireEvent.press(view.getByLabelText("Location and radius filter"));

    await waitFor(() => {
      expect(view.getByText("Use My Current Location")).toBeVisible();
    });

    await fireEvent.press(view.getByText("Use My Current Location"));

    await waitFor(() => {
      expect(location.requestPermission).toHaveBeenCalled();
      expect(location.getCurrentPosition).toHaveBeenCalled();
      expect(discovery.discoverGigsWithMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          workerLatitude: 14.5547,
          workerLongitude: 121.0244,
        }),
        profile.id,
      );
      expect(view.getByText("Current location")).toBeVisible();
    });
  });

  it("handles location permission denial with notice without breaking discovery", async () => {
    const discovery = createMockDiscoveryGateway(sampleDiscoveryGigs);
    const location = createMockLocationService({
      requestPermission: jest.fn().mockResolvedValue("denied"),
    });

    const view = await render(
      <AuthenticatedHomeScreen
        discovery={discovery}
        location={location}
        mode="worker"
        profile={profile}
      />,
    );

    await waitFor(() => {
      expect(view.getByLabelText("Location and radius filter")).toBeVisible();
    });

    await fireEvent.press(view.getByLabelText("Location and radius filter"));

    await waitFor(() => {
      expect(view.getByText("Use My Current Location")).toBeVisible();
    });

    await fireEvent.press(view.getByText("Use My Current Location"));

    await waitFor(() => {
      expect(
        view.getByText(
          "Location permission was denied. Select a locality below.",
        ),
      ).toBeVisible();
    });
  });
});
