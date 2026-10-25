import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { AuthProfile } from "@/features/auth/model/auth-state";
import type { DiscoveryGateway } from "@/features/discovery/data/discovery-gateway";
import type { DiscoveryGigCard } from "@/features/discovery/model/discovery-schemas";
import type { GigGateway } from "@/features/gigs/data/gig-gateway";
import type { GigRecord } from "@/features/gigs/model/gig-schemas";
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

jest.mock("@/features/shell/context/useShellMode", () => ({
  useShellMode: () => ({
    mode: "worker",
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
  beforeEach(() => jest.clearAllMocks());

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
      expect(view.getByText("NEARBY WORK NOTICEBOARD")).toBeVisible();
      expect(view.getByText("Grocery Delivery from Market")).toBeVisible();
      expect(view.getByText("PHP 450")).toBeVisible();
      expect(view.getByText(/1\.5 km/)).toBeVisible();
      expect(view.getByText("Within 5 km of you")).toBeVisible();
      expect(view.getByText("Recently posted")).toBeVisible();
    });
  });

  it("filters discovery by work mode (nearby vs remote)", async () => {
    const discovery = createMockDiscoveryGateway(sampleDiscoveryGigs);

    const view = await render(
      <AuthenticatedHomeScreen
        discovery={discovery}
        mode="worker"
        profile={profile}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("NEARBY WORK NOTICEBOARD")).toBeVisible();
    });

    await fireEvent.press(view.getByRole("button", { name: "Remote" }));

    await waitFor(() => {
      expect(discovery.discoverGigs).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({ workMode: "remote" }),
        }),
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
      expect(view.getByText("+ Post a gig")).toBeVisible();
    });

    await fireEvent.press(view.getByRole("button", { name: "+ Post a gig" }));
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
      expect(view.getByText("PHP 1,200")).toBeVisible();
      expect(view.getByText("PUBLISHED")).toBeVisible();
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
      expect(view.getByText("LOCATION & DISTANCE")).toBeVisible();
    });

    await fireEvent.press(view.getByLabelText("Location and radius filter"));

    await waitFor(() => {
      expect(view.getByText("Location & Radius")).toBeVisible();
    });

    await fireEvent.press(view.getByText("Bonifacio Global City"));

    await waitFor(() => {
      expect(discovery.discoverGigs).toHaveBeenCalledWith(
        expect.objectContaining({
          workerLatitude: 14.5492,
          workerLongitude: 121.0509,
        }),
      );
      expect(view.getByText("Bonifacio Global City")).toBeVisible();
      expect(view.getByText("MANUAL LOCALITY")).toBeVisible();
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
      expect(view.getByText("LOCATION & DISTANCE")).toBeVisible();
    });

    await fireEvent.press(view.getByLabelText("Location and radius filter"));

    await waitFor(() => {
      expect(view.getByText("Use My Current Location")).toBeVisible();
    });

    await fireEvent.press(view.getByText("Use My Current Location"));

    await waitFor(() => {
      expect(location.requestPermission).toHaveBeenCalled();
      expect(location.getCurrentPosition).toHaveBeenCalled();
      expect(discovery.discoverGigs).toHaveBeenCalledWith(
        expect.objectContaining({
          workerLatitude: 14.5547,
          workerLongitude: 121.0244,
        }),
      );
      expect(view.getByText("GPS FIX")).toBeVisible();
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
      expect(view.getByText("LOCATION & DISTANCE")).toBeVisible();
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
