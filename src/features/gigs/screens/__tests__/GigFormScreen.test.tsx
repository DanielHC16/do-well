import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import { useAuth } from "@/features/auth/context/useAuth";

import type { GigDraftStore } from "../../data/gig-draft-store";
import type { GigGateway } from "../../data/gig-gateway";
import { GigFormScreen } from "../GigFormScreen";

const mockReplace = jest.fn();

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("@/features/auth/context/useAuth", () => ({
  useAuth: jest.fn(),
}));

const mockedUseAuth = jest.mocked(useAuth);

function createMockGateway(): GigGateway {
  return {
    createDraft: jest.fn(async (input, employerId) => ({
      id: "a0000000-0000-4000-8000-000000000123",
      employerId,
      title: input.title,
      description: input.description,
      category: input.category,
      workMode: input.workMode,
      publicArea: input.publicArea,
      publicLatitude: null,
      publicLongitude: null,
      budgetAmount: input.budgetAmount,
      currency: "PHP",
      status: "draft" as const,
      applicationDeadline: null,
      dueAt: null,
      publishedAt: null,
      closedAt: null,
      createdAt: "2026-10-25T00:00:00.000Z",
      updatedAt: "2026-10-25T00:00:00.000Z",
    })),
    updateDraft: jest.fn(),
    publishGig: jest.fn(async (gigId) => ({
      id: gigId,
      employerId: "e0000000-0000-4000-8000-000000000001",
      title: "Test Gig",
      description: "Test description for validation passing.",
      category: "errands" as const,
      workMode: "onsite" as const,
      publicArea: "Makati",
      publicLatitude: null,
      publicLongitude: null,
      budgetAmount: 500,
      currency: "PHP",
      status: "published" as const,
      applicationDeadline: null,
      dueAt: null,
      publishedAt: "2026-10-25T01:00:00.000Z",
      closedAt: null,
      createdAt: "2026-10-25T00:00:00.000Z",
      updatedAt: "2026-10-25T01:00:00.000Z",
    })),
    closeGig: jest.fn(),
    listEmployerGigs: jest.fn(async () => []),
    getGigById: jest.fn(),
  };
}

function createMockDraftStore(): GigDraftStore {
  return {
    read: jest.fn(async () => null),
    save: jest.fn(async () => undefined),
    clear: jest.fn(async () => undefined),
  };
}

describe("GigFormScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      state: {
        route: "ready",
        status: "idle",
        userId: "e0000000-0000-4000-8000-000000000001",
        profile: {
          id: "e0000000-0000-4000-8000-000000000001",
          displayName: "Maria Santos",
          homeArea: "Makati",
          onboardingCompletedAt: "2026-10-25T00:00:00.000Z",
        },
        error: null,
        operationId: 1,
      },
      signOut: jest.fn(),
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
  });

  it("renders form inputs and AI brief disclaimer", async () => {
    const gateway = createMockGateway();
    const draftStore = createMockDraftStore();

    await render(<GigFormScreen draftStore={draftStore} gateway={gateway} />);

    expect(screen.getByText("POST A GIG")).toBeVisible();
    expect(screen.getByText("AI JOB BRIEF BUILDER")).toBeVisible();
    expect(screen.getByText("COMING IN M10")).toBeVisible();
    expect(screen.getByLabelText("Gig Title")).toBeVisible();
    expect(screen.getByLabelText("Neighborhood Area")).toBeVisible();
  });

  it("validates form and blocks publishing on empty fields", async () => {
    const gateway = createMockGateway();
    const draftStore = createMockDraftStore();

    await render(<GigFormScreen draftStore={draftStore} gateway={gateway} />);

    await fireEvent.press(screen.getByRole("button", { name: "Post notice" }));

    await waitFor(() => {
      expect(screen.getByText("CANNOT POST NOTICE")).toBeVisible();
    });
    expect(gateway.createDraft).not.toHaveBeenCalled();
  });

  it("publishes valid gig notice and redirects to detail view", async () => {
    const gateway = createMockGateway();
    const draftStore = createMockDraftStore();

    await render(<GigFormScreen draftStore={draftStore} gateway={gateway} />);

    await fireEvent.changeText(
      screen.getByLabelText("Gig Title"),
      "Garden Weeding and Tree Trimming",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Neighborhood Area"),
      "Poblacion, Makati",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Description"),
      "Need three hours of help clearing weeds from yard and cutting small branches.",
    );

    await fireEvent.press(screen.getByRole("button", { name: "Post notice" }));

    await waitFor(() => {
      expect(gateway.createDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Garden Weeding and Tree Trimming",
          category: "errands",
          workMode: "onsite",
          publicArea: "Poblacion, Makati",
        }),
        "e0000000-0000-4000-8000-000000000001",
      );
      expect(gateway.publishGig).toHaveBeenCalledWith(
        "a0000000-0000-4000-8000-000000000123",
      );
      expect(mockReplace).toHaveBeenCalledWith(
        "/(protected)/employer/gigs/a0000000-0000-4000-8000-000000000123",
      );
    });
  });
});
