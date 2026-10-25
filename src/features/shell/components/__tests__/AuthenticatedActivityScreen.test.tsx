import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { AssignmentGateway } from "@/features/assignments/data/assignment-gateway";
import type { ActivityEventRecord } from "@/features/assignments/model/assignment-schemas";

import { AuthenticatedActivityScreen } from "../AuthenticatedActivityScreen";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
};

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
}));

jest.mock("@/features/shell/context/useShellMode", () => ({
  useShellMode: () => ({
    mode: "worker",
    busy: false,
    error: null,
    switchMode: jest.fn(async () => true),
    retry: jest.fn(async () => undefined),
  }),
}));

const mockEvent: ActivityEventRecord = {
  id: "95000000-0000-4000-8000-000000000001",
  eventType: "gig_applicant_selected",
  payload: { title: "Makati Deep Cleaning" },
  dedupeKey: "selected:1",
  readAt: null,
  createdAt: "2026-10-25T01:00:00.000Z",
  gigId: "91000000-0000-4000-8000-000000000001",
  assignmentId: "90000000-0000-4000-8000-000000000001",
};

function createMockGateway(
  events: ActivityEventRecord[] = [],
): AssignmentGateway {
  return {
    confirmAssignment: jest.fn(),
    declineAssignment: jest.fn(),
    cancelProposedAssignment: jest.fn(),
    createMilestone: jest.fn(),
    startMilestone: jest.fn(),
    listMilestones: jest.fn(async () => []),
    getAssignmentDetail: jest.fn(),
    listUserActivity: jest.fn(async () => events),
    markActivityRead: jest.fn(async (id: string) => ({
      ...mockEvent,
      id,
      readAt: "2026-10-25T02:00:00.000Z",
    })),
  };
}

describe("AuthenticatedActivityScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the empty activity notice when no events exist", async () => {
    const gateway = createMockGateway([]);
    const view = await render(
      <AuthenticatedActivityScreen gateway={gateway} />,
    );

    await waitFor(() => {
      expect(view.getByText("Nothing gets lost in the handoff.")).toBeVisible();
      expect(view.getByText("No activity yet")).toBeVisible();
      expect(view.getByText("RECENT ACTIVITY")).toBeVisible();
    });
  });

  it("renders event cards and navigates on press", async () => {
    const gateway = createMockGateway([mockEvent]);
    const view = await render(
      <AuthenticatedActivityScreen gateway={gateway} />,
    );

    await waitFor(() => {
      expect(view.getByText("Selected for Task")).toBeVisible();
      expect(view.getByText("NEW")).toBeVisible();
      expect(
        view.getByText(
          'You were selected as the worker for "Makati Deep Cleaning". Review and confirm the agreement.',
        ),
      ).toBeVisible();
    });

    const card = view.getByRole("button", {
      name: /Selected for Task/,
    });
    await fireEvent.press(card);

    expect(gateway.markActivityRead).toHaveBeenCalledWith(mockEvent.id);
    expect(mockRouter.push).toHaveBeenCalledWith(
      `/(protected)/worker/assignments/${mockEvent.assignmentId}`,
    );
  });
});
