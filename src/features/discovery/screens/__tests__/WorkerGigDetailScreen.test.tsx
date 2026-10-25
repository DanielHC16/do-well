import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

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

function createMockGateway(
  gig: DiscoveryGigCard | null = mockGig,
): DiscoveryGateway {
  return {
    discoverGigs: jest.fn(async () => []),
    getPublicGig: jest.fn(async () => gig),
  };
}

describe("WorkerGigDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders public gig notice details, reasons, and M07 application notice", async () => {
    const gateway = createMockGateway(mockGig);

    await render(
      <WorkerGigDetailScreen
        gateway={gateway}
        gigId="81000000-0000-4000-8000-000000000001"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Makati House Deep Cleaning")).toBeVisible();
    });

    expect(screen.getByText("PHP 1,200")).toBeVisible();
    expect(screen.getByText("Poblacion, Makati")).toBeVisible();
    expect(screen.getByText("Within 5 km of you")).toBeVisible();
    expect(screen.getByText("Recently posted")).toBeVisible();
    expect(screen.getByText("COMING IN M07")).toBeVisible();
    expect(
      screen.getByText(
        "Exact address is provided once selected by the employer.",
      ),
    ).toBeVisible();
  });

  it("renders error state when gig is missing or unpublished", async () => {
    const gateway = createMockGateway(null);

    await render(
      <WorkerGigDetailScreen gateway={gateway} gigId="missing-id" />,
    );

    await waitFor(() => {
      expect(screen.getByText("NOTICE UNAVAILABLE")).toBeVisible();
      expect(
        screen.getByText("Notice not found or no longer available."),
      ).toBeVisible();
    });

    await fireEvent.press(
      screen.getByRole("button", { name: "Return to noticeboard" }),
    );
    expect(mockReplace).toHaveBeenCalledWith("/(protected)/worker");
  });
});
