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

function createMockNotifications(granted = false) {
  return {
    checkPermissions: jest.fn(async () => granted),
    requestPermissions: jest.fn(async () => true),
    configureChannels: jest.fn(async () => undefined),
    scheduleNotification: jest.fn(async () => "notification-id"),
  };
}

function createMockDedupeStore(initialized = false) {
  return {
    list: jest.fn(async () => []),
    mark: jest.fn(async () => undefined),
    isInitialized: jest.fn(async () => initialized),
    initialize: jest.fn(async () => undefined),
  };
}

describe("AuthenticatedActivityScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the empty activity notice when no events exist", async () => {
    const gateway = createMockGateway([]);
    const notifications = createMockNotifications();
    const view = await render(
      <AuthenticatedActivityScreen
        dedupeStore={createMockDedupeStore()}
        gateway={gateway}
        notifications={notifications}
        userId="80000000-0000-4000-8000-000000000002"
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Nothing gets lost in the handoff.")).toBeVisible();
      expect(view.getByText("No activity yet")).toBeVisible();
      expect(view.getByText("RECENT ACTIVITY")).toBeVisible();
    });
  });

  it("renders event cards and navigates on press", async () => {
    const gateway = createMockGateway([mockEvent]);
    const notifications = createMockNotifications();
    const view = await render(
      <AuthenticatedActivityScreen
        dedupeStore={createMockDedupeStore()}
        gateway={gateway}
        notifications={notifications}
        userId="80000000-0000-4000-8000-000000000002"
      />,
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

  it("configures Android channels when permission was already granted", async () => {
    const notifications = createMockNotifications(true);
    await render(
      <AuthenticatedActivityScreen
        dedupeStore={createMockDedupeStore()}
        gateway={createMockGateway([])}
        notifications={notifications}
        userId="80000000-0000-4000-8000-000000000002"
      />,
    );

    await waitFor(() => {
      expect(notifications.configureChannels).toHaveBeenCalledTimes(1);
    });
  });

  it("creates a first opt-in baseline without alerting historical events", async () => {
    const notifications = createMockNotifications();
    const dedupeStore = createMockDedupeStore();
    const view = await render(
      <AuthenticatedActivityScreen
        dedupeStore={dedupeStore}
        gateway={createMockGateway([mockEvent])}
        notifications={notifications}
        userId="80000000-0000-4000-8000-000000000002"
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Enable local alerts")).toBeVisible();
    });
    fireEvent.press(view.getByLabelText("Enable local activity alerts"));

    await waitFor(() => {
      expect(notifications.requestPermissions).toHaveBeenCalledTimes(1);
      expect(dedupeStore.initialize).toHaveBeenCalledWith(
        "80000000-0000-4000-8000-000000000002",
        [mockEvent.id],
      );
      expect(notifications.scheduleNotification).not.toHaveBeenCalled();
    });
  });

  it("schedules and records an unseen event after the baseline exists", async () => {
    const notifications = createMockNotifications(true);
    const dedupeStore = createMockDedupeStore(true);

    await render(
      <AuthenticatedActivityScreen
        dedupeStore={dedupeStore}
        gateway={createMockGateway([mockEvent])}
        notifications={notifications}
        userId="80000000-0000-4000-8000-000000000002"
      />,
    );

    await waitFor(() => {
      expect(notifications.scheduleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `activity_${mockEvent.id}`,
          title: "Selected for Task",
        }),
      );
      expect(dedupeStore.mark).toHaveBeenCalledWith(
        "80000000-0000-4000-8000-000000000002",
        mockEvent.id,
      );
    });
  });
});
