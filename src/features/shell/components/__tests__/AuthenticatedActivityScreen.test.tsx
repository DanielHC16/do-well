import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import type { AssignmentGateway } from "@/features/assignments/data/assignment-gateway";
import type { ActivityEventRecord } from "@/features/assignments/model/assignment-schemas";

import {
  AuthenticatedActivityScreen,
  groupActivity,
} from "../AuthenticatedActivityScreen";

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
    getAssignmentDetailWithMetadata: jest.fn(),
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

  it("shows a slim alerts banner only while alerts are off, without auto-requesting", async () => {
    const notifications = createMockNotifications();
    const view = await render(
      <AuthenticatedActivityScreen
        gateway={createMockGateway([mockEvent])}
        notifications={notifications}
        dedupeStore={createMockDedupeStore()}
        userId="80000000-0000-4000-8000-000000000002"
      />,
    );
    await view.findByText("Selected for Task");
    expect(view.getByText("Turn on device alerts")).toBeVisible();
    expect(notifications.requestPermissions).not.toHaveBeenCalled();

    const granted = await render(
      <AuthenticatedActivityScreen
        gateway={createMockGateway([])}
        notifications={createMockNotifications(true)}
        dedupeStore={createMockDedupeStore()}
        userId="80000000-0000-4000-8000-000000000003"
      />,
    );
    await granted.findByText("No activity yet");
    await waitFor(() =>
      expect(granted.queryByText("Turn on device alerts")).toBeNull(),
    );
  });

  it("dismisses the alerts banner for the rest of the session", async () => {
    const userId = "80000000-0000-4000-8000-000000000009";
    const view = await render(
      <AuthenticatedActivityScreen
        gateway={createMockGateway([])}
        notifications={createMockNotifications()}
        dedupeStore={createMockDedupeStore()}
        userId={userId}
      />,
    );
    await fireEvent.press(
      view.getByRole("button", { name: "Dismiss device alerts suggestion" }),
    );
    expect(view.queryByText("Turn on device alerts")).toBeNull();
    await view.unmount();
    const again = await render(
      <AuthenticatedActivityScreen
        gateway={createMockGateway([])}
        notifications={createMockNotifications()}
        dedupeStore={createMockDedupeStore()}
        userId={userId}
      />,
    );
    await again.findByText("No activity yet");
    expect(again.queryByText("Turn on device alerts")).toBeNull();
  });

  it("groups events into Today and Earlier", () => {
    const now = new Date(2026, 9, 31, 15);
    const groups = groupActivity(
      [
        {
          ...mockEvent,
          id: "a",
          createdAt: new Date(2026, 9, 31, 9).toISOString(),
        },
        {
          ...mockEvent,
          id: "b",
          createdAt: new Date(2026, 9, 29, 9).toISOString(),
        },
      ],
      now,
    );
    expect(groups.map((group) => [group.title, group.events.length])).toEqual([
      ["Today", 1],
      ["Earlier", 1],
    ]);
    expect(groupActivity([], now)).toEqual([]);
  });

  it("shows a busy skeleton instead of an empty trail while loading", async () => {
    let finish: () => void = () => undefined;
    const pending = new Promise<ActivityEventRecord[]>((resolve) => {
      finish = () => resolve([]);
    });
    const gateway = createMockGateway();
    jest.mocked(gateway.listUserActivity).mockImplementation(() => pending);
    const view = await render(
      <AuthenticatedActivityScreen
        gateway={gateway}
        notifications={createMockNotifications()}
        dedupeStore={createMockDedupeStore()}
        userId="80000000-0000-4000-8000-000000000002"
      />,
    );
    expect(view.getByLabelText("Loading activity")).toBeBusy();
    expect(view.queryByRole("button", { name: "Refresh activity" })).toBeNull();
    expect(view.queryByText("No activity yet")).toBeNull();
    await act(async () => finish());
    expect(await view.findByText("No activity yet")).toBeVisible();
  });

  it("retries a failed activity read without presenting an empty trail", async () => {
    const gateway = createMockGateway();
    jest
      .mocked(gateway.listUserActivity)
      .mockRejectedValueOnce(new Error("private details"));
    const view = await render(
      <AuthenticatedActivityScreen
        gateway={gateway}
        notifications={createMockNotifications()}
        dedupeStore={createMockDedupeStore()}
        userId="80000000-0000-4000-8000-000000000002"
      />,
    );
    expect(
      await view.findByText("We couldn't load your activity. Try again."),
    ).toBeVisible();
    expect(view.queryByText("No activity yet")).toBeNull();
    expect(view.queryByText("private details")).toBeNull();
    await fireEvent.press(view.getByRole("button", { name: "Try again" }));
    expect(await view.findByText("No activity yet")).toBeVisible();
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
      expect(view.getByRole("header", { name: "Activity" })).toBeVisible();
      expect(view.getByText("No activity yet")).toBeVisible();
      expect(view.queryByText("Recent activity")).toBeNull();
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
      expect(view.getByRole("header", { name: "Earlier" })).toBeVisible();
      expect(
        view.getByText(
          'You were selected as the worker for "Makati Deep Cleaning". Review and confirm the agreement.',
        ),
      ).toBeVisible();
    });

    const card = view.getByRole("button", {
      name: /^Unread\. Selected for Task/,
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
      expect(
        view.getByRole("button", { name: "Enable local activity alerts" }),
      ).toBeVisible();
    });
    await fireEvent.press(view.getByLabelText("Enable local activity alerts"));

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
