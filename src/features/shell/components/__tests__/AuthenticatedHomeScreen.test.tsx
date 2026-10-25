import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { AuthProfile } from "@/features/auth/model/auth-state";
import type { GigGateway } from "@/features/gigs/data/gig-gateway";
import type { GigRecord } from "@/features/gigs/model/gig-schemas";

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

const profile: AuthProfile = {
  id: "e0000000-0000-4000-8000-000000000001",
  displayName: "Ari Santos",
  homeArea: "Makati",
  onboardingCompletedAt: "2026-10-25T00:00:00.000Z",
};

const sampleGigs: GigRecord[] = [
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

function createMockGateway(gigs: GigRecord[] = []): GigGateway {
  return {
    createDraft: jest.fn(),
    updateDraft: jest.fn(),
    publishGig: jest.fn(),
    closeGig: jest.fn(),
    getGigById: jest.fn(),
    listEmployerGigs: jest.fn(async () => gigs),
  };
}

describe("AuthenticatedHomeScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows a truthful worker empty state and mode-specific actions", async () => {
    const view = await render(
      <AuthenticatedHomeScreen mode="worker" profile={profile} />,
    );

    expect(view.getByText("Good work starts nearby.")).toBeVisible();
    expect(view.getByText("No live gigs yet")).toBeVisible();
    expect(
      view.getByRole("radio", { name: "Show employer workspace" }),
    ).toBeVisible();
    expect(view.queryByText("Post a new gig")).toBeNull();
  });

  it("switches presentation mode and replaces the workspace route", async () => {
    const view = await render(
      <AuthenticatedHomeScreen mode="worker" profile={profile} />,
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
    const gateway = createMockGateway([]);
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
    const gateway = createMockGateway(sampleGigs);
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
});
