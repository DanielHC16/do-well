import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { AssignmentGateway } from "../../data/assignment-gateway";
import type {
  AssignmentDetail,
  MilestoneRecord,
} from "../../model/assignment-schemas";
import { WorkerAssignmentDetailScreen } from "../WorkerAssignmentDetailScreen";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
}));

const mockAssignmentDetail: AssignmentDetail = {
  assignment: {
    id: "90000000-0000-4000-8000-000000000001",
    gigId: "91000000-0000-4000-8000-000000000001",
    applicationId: "92000000-0000-4000-8000-000000000001",
    employerId: "80000000-0000-4000-8000-000000000001",
    workerId: "80000000-0000-4000-8000-000000000002",
    agreementVersion: 1,
    agreedTitle: "Office Desk Assembly",
    agreedDescription: "Assemble 4 desks and 6 chairs carefully.",
    agreedAmount: 2500,
    currency: "PHP",
    dueAt: null,
    status: "proposed",
    employerConfirmedAt: "2026-10-25T01:00:00.000Z",
    workerConfirmedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    clientRequestId: "93000000-0000-4000-8000-000000000001",
    createdAt: "2026-10-25T01:00:00.000Z",
    updatedAt: "2026-10-25T01:00:00.000Z",
  },
  employer: {
    id: "80000000-0000-4000-8000-000000000001",
    displayName: "Elena Employer",
    homeArea: "Legazpi Village, Makati",
  },
  worker: {
    id: "80000000-0000-4000-8000-000000000002",
    displayName: "Warren Worker",
    homeArea: "Poblacion, Makati",
  },
  gig: {
    id: "91000000-0000-4000-8000-000000000001",
    title: "Office Desk Assembly",
    category: "errands",
    workMode: "onsite",
    publicArea: "Legazpi Village, Makati",
  },
};

const mockMilestone: MilestoneRecord = {
  id: "94000000-0000-4000-8000-000000000001",
  assignmentId: "90000000-0000-4000-8000-000000000001",
  position: 1,
  title: "Desk Setup",
  description: "Assemble 4 desks.",
  dueAt: null,
  status: "pending",
  approvedAt: null,
  createdAt: "2026-10-25T01:00:00.000Z",
  updatedAt: "2026-10-25T01:00:00.000Z",
};

function createMockGateway(
  detail: AssignmentDetail = mockAssignmentDetail,
  milestones: MilestoneRecord[] = [],
): AssignmentGateway {
  return {
    confirmAssignment: jest.fn(async () => ({
      ...detail.assignment,
      status: "active" as const,
      workerConfirmedAt: "2026-10-25T02:00:00.000Z",
      startedAt: "2026-10-25T02:00:00.000Z",
    })),
    declineAssignment: jest.fn(async () => ({
      ...detail.assignment,
      status: "declined" as const,
      cancelledAt: "2026-10-25T02:00:00.000Z",
    })),
    cancelProposedAssignment: jest.fn(),
    createMilestone: jest.fn(),
    startMilestone: jest.fn(async () => ({
      ...mockMilestone,
      status: "in_progress" as const,
    })),
    listMilestones: jest.fn(async () => milestones),
    getAssignmentDetail: jest.fn(async () => detail),
    listUserActivity: jest.fn(async () => []),
    markActivityRead: jest.fn(),
  };
}

describe("WorkerAssignmentDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders proposed agreement terms and confirmation actions", async () => {
    const gateway = createMockGateway(mockAssignmentDetail, [mockMilestone]);
    const view = await render(
      <WorkerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Office Desk Assembly")).toBeVisible();
      expect(view.getByText("Elena Employer")).toBeVisible();
      expect(view.getByText("₱2,500")).toBeVisible();
      expect(view.getByText("REVIEW AND CONFIRM")).toBeVisible();
      expect(view.getByText("Accept Agreement")).toBeVisible();
      expect(view.getByText("Decline")).toBeVisible();
    });
  });

  it("allows worker to accept agreement", async () => {
    const gateway = createMockGateway(mockAssignmentDetail);
    const view = await render(
      <WorkerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Accept Agreement")).toBeVisible();
    });

    await fireEvent.press(view.getByText("Accept Agreement"));

    expect(gateway.confirmAssignment).toHaveBeenCalledWith(
      "90000000-0000-4000-8000-000000000001",
    );
    await waitFor(() => {
      expect(
        view.getByText("Agreement confirmed! You can now start working."),
      ).toBeVisible();
    });
  });

  it("allows worker to decline agreement", async () => {
    const gateway = createMockGateway(mockAssignmentDetail);
    const view = await render(
      <WorkerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Decline")).toBeVisible();
    });

    await fireEvent.press(view.getByText("Decline"));

    expect(gateway.declineAssignment).toHaveBeenCalledWith(
      "90000000-0000-4000-8000-000000000001",
    );
    await waitFor(() => {
      expect(view.getByText("Agreement proposal declined.")).toBeVisible();
    });
  });

  it("allows worker to start milestone on active assignment", async () => {
    const activeDetail: AssignmentDetail = {
      ...mockAssignmentDetail,
      assignment: {
        ...mockAssignmentDetail.assignment,
        status: "active",
      },
    };
    const gateway = createMockGateway(activeDetail, [mockMilestone]);
    const view = await render(
      <WorkerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Start Milestone")).toBeVisible();
    });

    await fireEvent.press(view.getByText("Start Milestone"));

    expect(gateway.startMilestone).toHaveBeenCalledWith(mockMilestone.id);
    await waitFor(() => {
      expect(view.getByText("Started milestone: Desk Setup")).toBeVisible();
    });
  });
});
