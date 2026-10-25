import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type {
  SubmissionGateway,
  SubmissionRecord,
} from "@/features/submissions";

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

jest.mock("@/features/submissions/data/submission-gateway", () => ({
  submissionGateway: {
    submitAssignmentWork: jest.fn(),
    requestSubmissionRevision: jest.fn(async () => ({
      id: "s0000000-0000-4000-8000-000000000001",
      assignmentId: "90000000-0000-4000-8000-000000000001",
      milestoneId: null,
      submittedBy: "80000000-0000-4000-8000-000000000002",
      version: 1,
      note: "All tasks completed.",
      status: "revision_requested" as const,
      reviewNote: "Please re-mount rack 2.",
      submittedAt: "2026-10-25T03:00:00.000Z",
      reviewedAt: "2026-10-25T04:00:00.000Z",
      clientRequestId: "c0000000-0000-4000-8000-000000000001",
      createdAt: "2026-10-25T03:00:00.000Z",
      updatedAt: "2026-10-25T04:00:00.000Z",
    })),
    approveAssignmentCompletion: jest.fn(async () => ({
      id: "s0000000-0000-4000-8000-000000000001",
      assignmentId: "90000000-0000-4000-8000-000000000001",
      milestoneId: null,
      submittedBy: "80000000-0000-4000-8000-000000000002",
      version: 1,
      note: "All tasks completed.",
      status: "approved" as const,
      reviewNote: null,
      submittedAt: "2026-10-25T03:00:00.000Z",
      reviewedAt: "2026-10-25T04:00:00.000Z",
      clientRequestId: "c0000000-0000-4000-8000-000000000001",
      createdAt: "2026-10-25T03:00:00.000Z",
      updatedAt: "2026-10-25T04:00:00.000Z",
    })),
    listAssignmentSubmissions: jest.fn(async () => []),
    getLatestAssignmentSubmission: jest.fn(async () => null),
  },
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

const mockSubmission: SubmissionRecord = {
  id: "s0000000-0000-4000-8000-000000000001",
  assignmentId: "90000000-0000-4000-8000-000000000001",
  milestoneId: null,
  submittedBy: "80000000-0000-4000-8000-000000000002",
  version: 1,
  note: "All desks assembled and arranged in conference room.",
  status: "submitted",
  reviewNote: null,
  submittedAt: "2026-10-25T03:00:00.000Z",
  reviewedAt: null,
  clientRequestId: "c0000000-0000-4000-8000-000000000001",
  createdAt: "2026-10-25T03:00:00.000Z",
  updatedAt: "2026-10-25T03:00:00.000Z",
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

function createMockSubmissionsGateway(
  submissions: SubmissionRecord[] = [],
): SubmissionGateway {
  return {
    submitAssignmentWork: jest.fn(),
    requestSubmissionRevision: jest.fn(async (input) => ({
      id: input.submissionId,
      assignmentId: "90000000-0000-4000-8000-000000000001",
      milestoneId: null,
      submittedBy: "80000000-0000-4000-8000-000000000002",
      version: 1,
      note: "Work note",
      status: "revision_requested" as const,
      reviewNote: input.reviewNote,
      submittedAt: "2026-10-25T03:00:00.000Z",
      reviewedAt: "2026-10-25T04:00:00.000Z",
      clientRequestId: "c0000000-0000-4000-8000-000000000001",
      createdAt: "2026-10-25T03:00:00.000Z",
      updatedAt: "2026-10-25T04:00:00.000Z",
    })),
    approveAssignmentCompletion: jest.fn(async (input) => ({
      id: input.submissionId,
      assignmentId: "90000000-0000-4000-8000-000000000001",
      milestoneId: null,
      submittedBy: "80000000-0000-4000-8000-000000000002",
      version: 1,
      note: "Work note",
      status: "approved" as const,
      reviewNote: input.reviewNote ?? null,
      submittedAt: "2026-10-25T03:00:00.000Z",
      reviewedAt: "2026-10-25T04:00:00.000Z",
      clientRequestId: "c0000000-0000-4000-8000-000000000001",
      createdAt: "2026-10-25T03:00:00.000Z",
      updatedAt: "2026-10-25T04:00:00.000Z",
    })),
    listAssignmentSubmissions: jest.fn(async () => submissions),
    getLatestAssignmentSubmission: jest.fn(async () => submissions[0] ?? null),
  };
}

describe("EmployerAssignmentDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders proposed agreement terms and cancel proposal button", async () => {
    const gateway = createMockGateway(mockAssignmentDetail, [mockMilestone]);
    const submissionsGw = createMockSubmissionsGateway();
    const view = await render(
      <EmployerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
        submissionsGateway={submissionsGw}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Office Desk Assembly")).toBeVisible();
      expect(view.getByText("Warren Worker")).toBeVisible();
      expect(view.getByText("₱2,500")).toBeVisible();
      expect(view.getByText("AWAITING WORKER ACCEPTANCE")).toBeVisible();
      expect(view.getByText("Cancel Selection & Reopen Gig")).toBeVisible();
    });
  });

  it("allows employer to cancel proposal and reopen gig", async () => {
    const gateway = createMockGateway(mockAssignmentDetail);
    const submissionsGw = createMockSubmissionsGateway();
    const view = await render(
      <EmployerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
        submissionsGateway={submissionsGw}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Cancel Selection & Reopen Gig")).toBeVisible();
    });

    await fireEvent.press(view.getByText("Cancel Selection & Reopen Gig"));

    expect(gateway.cancelProposedAssignment).toHaveBeenCalledWith(
      "90000000-0000-4000-8000-000000000001",
    );
    await waitFor(() => {
      expect(
        view.getByText("Assignment proposal cancelled. Gig notice reopened."),
      ).toBeVisible();
    });
  });

  it("allows employer to add milestone step on active assignment", async () => {
    const activeDetail: AssignmentDetail = {
      ...mockAssignmentDetail,
      assignment: {
        ...mockAssignmentDetail.assignment,
        status: "active",
      },
    };
    const gateway = createMockGateway(activeDetail);
    const submissionsGw = createMockSubmissionsGateway();
    const view = await render(
      <EmployerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
        submissionsGateway={submissionsGw}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("+ Add Step")).toBeVisible();
    });

    await fireEvent.press(view.getByText("+ Add Step"));

    await waitFor(() => {
      expect(view.getByText("NEW MILESTONE STEP")).toBeVisible();
    });

    await fireEvent.changeText(
      view.getByPlaceholderText("Step title (e.g., Mount rack fixtures)"),
      "Mount wall racks",
    );
    await fireEvent.changeText(
      view.getByPlaceholderText(
        "Optional description of tasks for this step...",
      ),
      "Fix brackets securely to brick wall.",
    );

    await fireEvent.press(view.getByText("Save Step"));

    expect(gateway.createMilestone).toHaveBeenCalledWith({
      assignmentId: "90000000-0000-4000-8000-000000000001",
      title: "Mount wall racks",
      description: "Fix brackets securely to brick wall.",
    });

    await waitFor(() => {
      expect(
        view.getByText("Milestone step added successfully."),
      ).toBeVisible();
    });
  });

  it("allows employer to review and approve submitted work", async () => {
    const submittedDetail: AssignmentDetail = {
      ...mockAssignmentDetail,
      assignment: {
        ...mockAssignmentDetail.assignment,
        status: "submitted",
      },
    };
    const gateway = createMockGateway(submittedDetail);
    const submissionsGw = createMockSubmissionsGateway([mockSubmission]);

    const view = await render(
      <EmployerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
        submissionsGateway={submissionsGw}
      />,
    );

    await waitFor(() => {
      expect(
        view.getByText("WORK SUBMITTED · AWAITING YOUR REVIEW"),
      ).toBeVisible();
      expect(
        view.getByText(
          '"All desks assembled and arranged in conference room."',
        ),
      ).toBeVisible();
      expect(view.getByText("Approve & Complete Work")).toBeVisible();
    });

    await fireEvent.press(view.getByText("Approve & Complete Work"));

    expect(submissionsGw.approveAssignmentCompletion).toHaveBeenCalledWith({
      submissionId: mockSubmission.id,
    });

    await waitFor(() => {
      expect(
        view.getByText("Work approved and task agreement completed!"),
      ).toBeVisible();
    });
  });

  it("allows employer to request revisions on submitted work", async () => {
    const submittedDetail: AssignmentDetail = {
      ...mockAssignmentDetail,
      assignment: {
        ...mockAssignmentDetail.assignment,
        status: "submitted",
      },
    };
    const gateway = createMockGateway(submittedDetail);
    const submissionsGw = createMockSubmissionsGateway([mockSubmission]);

    const view = await render(
      <EmployerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
        submissionsGateway={submissionsGw}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Request Revision")).toBeVisible();
    });

    await fireEvent.press(view.getByText("Request Revision"));

    await waitFor(() => {
      expect(view.getByText("SPECIFY REVISION INSTRUCTIONS")).toBeVisible();
    });

    await fireEvent.changeText(
      view.getByLabelText("Revision feedback note"),
      "Please re-align desk 2 with the cable tray.",
    );
    await fireEvent.press(view.getByText("Send Revision Request"));

    expect(submissionsGw.requestSubmissionRevision).toHaveBeenCalledWith({
      submissionId: mockSubmission.id,
      reviewNote: "Please re-align desk 2 with the cable tray.",
    });

    await waitFor(() => {
      expect(
        view.getByText(
          "Revision requested. The worker has been notified to make adjustments.",
        ),
      ).toBeVisible();
    });
  });

  it("renders completed contract banner when completed", async () => {
    const completedDetail: AssignmentDetail = {
      ...mockAssignmentDetail,
      assignment: {
        ...mockAssignmentDetail.assignment,
        status: "completed",
      },
    };
    const gateway = createMockGateway(completedDetail);
    const submissionsGw = createMockSubmissionsGateway([mockSubmission]);

    const view = await render(
      <EmployerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
        submissionsGateway={submissionsGw}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("CONTRACT COMPLETED")).toBeVisible();
      expect(
        view.getByText(
          "Work has been reviewed, approved, and finalized. Total paid: ₱2,500.",
        ),
      ).toBeVisible();
    });
  });
});
