import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { AssignmentGateway } from "../../data/assignment-gateway";
import type {
  AssignmentDetail,
  MilestoneRecord,
} from "../../model/assignment-schemas";
import { EmployerAssignmentDetailScreen } from "../EmployerAssignmentDetailScreen";

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
    confirmAssignment: jest.fn(),
    declineAssignment: jest.fn(),
    cancelProposedAssignment: jest.fn(async () => ({
      ...detail.assignment,
      status: "cancelled" as const,
      cancelledAt: "2026-10-25T02:00:00.000Z",
    })),
    createMilestone: jest.fn(async (input) => ({
      id: "94000000-0000-4000-8000-000000000002",
      assignmentId: input.assignmentId,
      position: milestones.length + 1,
      title: input.title,
      description: input.description ?? null,
      dueAt: null,
      status: "pending" as const,
      approvedAt: null,
      createdAt: "2026-10-25T02:00:00.000Z",
      updatedAt: "2026-10-25T02:00:00.000Z",
    })),
    startMilestone: jest.fn(),
    listMilestones: jest.fn(async () => milestones),
    getAssignmentDetail: jest.fn(async () => detail),
    listUserActivity: jest.fn(async () => []),
    markActivityRead: jest.fn(),
  };
}

describe("EmployerAssignmentDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders assigned contract and awaiting worker notice", async () => {
    const gateway = createMockGateway(mockAssignmentDetail, [mockMilestone]);
    const view = await render(
      <EmployerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Office Desk Assembly")).toBeVisible();
      expect(view.getByText("Warren Worker")).toBeVisible();
      expect(view.getByText("AWAITING WORKER ACCEPTANCE")).toBeVisible();
      expect(view.getByText("+ Add Step")).toBeVisible();
      expect(view.getByText("Desk Setup")).toBeVisible();
    });
  });

  it("allows employer to create a new milestone", async () => {
    const gateway = createMockGateway(mockAssignmentDetail);
    const view = await render(
      <EmployerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("+ Add Step")).toBeVisible();
    });

    await fireEvent.press(view.getByText("+ Add Step"));

    expect(view.getByText("NEW MILESTONE (STEP 1)")).toBeVisible();

    const titleInput = view.getByLabelText("Milestone title input");
    const descInput = view.getByLabelText("Milestone description input");

    await fireEvent.changeText(titleInput, "Chair Assembly");
    await fireEvent.changeText(
      descInput,
      "Unbox and assemble 6 office chairs.",
    );

    await fireEvent.press(view.getByText("Save Step"));

    expect(gateway.createMilestone).toHaveBeenCalledWith({
      assignmentId: "90000000-0000-4000-8000-000000000001",
      title: "Chair Assembly",
      description: "Unbox and assemble 6 office chairs.",
    });

    await waitFor(() => {
      expect(view.getByText("Added Milestone 1: Chair Assembly")).toBeVisible();
    });
  });

  it("allows employer to cancel proposed assignment", async () => {
    const gateway = createMockGateway(mockAssignmentDetail);
    const view = await render(
      <EmployerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Cancel Proposal and Reopen Gig")).toBeVisible();
    });

    await fireEvent.press(view.getByText("Cancel Proposal and Reopen Gig"));

    expect(gateway.cancelProposedAssignment).toHaveBeenCalledWith(
      "90000000-0000-4000-8000-000000000001",
    );

    await waitFor(() => {
      expect(
        view.getByText("Assignment proposal cancelled. Gig notice reopened."),
      ).toBeVisible();
    });
  });
});
