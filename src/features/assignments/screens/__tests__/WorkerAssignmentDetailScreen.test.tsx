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
import { WorkerAssignmentDetailScreen } from "../WorkerAssignmentDetailScreen";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

jest.mock("@/features/submissions/data/submission-gateway", () => ({
  submissionGateway: {
    submitAssignmentWork: jest.fn(async () => ({
      id: "s0000000-0000-4000-8000-000000000001",
      assignmentId: "90000000-0000-4000-8000-000000000001",
      milestoneId: null,
      submittedBy: "80000000-0000-4000-8000-000000000002",
      version: 1,
      note: "All tasks completed.",
      status: "submitted" as const,
      reviewNote: null,
      submittedAt: "2026-10-25T03:00:00.000Z",
      reviewedAt: null,
      clientRequestId: "c0000000-0000-4000-8000-000000000001",
      createdAt: "2026-10-25T03:00:00.000Z",
      updatedAt: "2026-10-25T03:00:00.000Z",
    })),
    requestSubmissionRevision: jest.fn(),
    approveAssignmentCompletion: jest.fn(),
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
  description: "Assemble first 2 desks",
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

function createMockSubmissionsGateway(
  submissions: SubmissionRecord[] = [],
): SubmissionGateway {
  return {
    submitAssignmentWork: jest.fn(async (input) => ({
      id: "s0000000-0000-4000-8000-000000000099",
      assignmentId: input.assignmentId,
      milestoneId: input.milestoneId ?? null,
      submittedBy: "80000000-0000-4000-8000-000000000002",
      version: submissions.length + 1,
      note: input.note ?? null,
      status: "submitted" as const,
      reviewNote: null,
      submittedAt: "2026-10-25T03:00:00.000Z",
      reviewedAt: null,
      clientRequestId:
        input.clientRequestId ?? "c0000000-0000-4000-8000-000000000099",
      createdAt: "2026-10-25T03:00:00.000Z",
      updatedAt: "2026-10-25T03:00:00.000Z",
    })),
    beginSubmission: jest.fn(async (input) => ({
      id: "s0000000-0000-4000-8000-000000000099",
      assignmentId: input.assignmentId,
      milestoneId: input.milestoneId ?? null,
      submittedBy: "80000000-0000-4000-8000-000000000002",
      version: submissions.length + 1,
      note: input.note ?? null,
      status: "pending_upload" as const,
      reviewNote: null,
      submittedAt: null,
      reviewedAt: null,
      clientRequestId:
        input.clientRequestId ?? "c0000000-0000-4000-8000-000000000099",
      createdAt: "2026-10-25T03:00:00.000Z",
      updatedAt: "2026-10-25T03:00:00.000Z",
    })),
    finalizeSubmission: jest.fn(async (input) => ({
      id: input.submissionId,
      assignmentId: "90000000-0000-4000-8000-000000000001",
      milestoneId: null,
      submittedBy: "80000000-0000-4000-8000-000000000002",
      version: submissions.length + 1,
      note: "Work completed with photo evidence.",
      status: "submitted" as const,
      reviewNote: null,
      submittedAt: "2026-10-25T03:05:00.000Z",
      reviewedAt: null,
      clientRequestId: "c0000000-0000-4000-8000-000000000099",
      createdAt: "2026-10-25T03:00:00.000Z",
      updatedAt: "2026-10-25T03:05:00.000Z",
    })),
    listSubmissionFiles: jest.fn(async () => []),
    createEvidenceSignedUrl: jest.fn(
      async () => "https://signed.url/evidence.jpg",
    ),
    uploadEvidenceBlob: jest.fn(async (path) => path),
    requestSubmissionRevision: jest.fn(),
    approveAssignmentCompletion: jest.fn(),
    listAssignmentSubmissions: jest.fn(async () => submissions),
    getLatestAssignmentSubmission: jest.fn(async () => submissions[0] ?? null),
  };
}

describe("WorkerAssignmentDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders proposed agreement terms and confirmation actions", async () => {
    const gateway = createMockGateway(mockAssignmentDetail, [mockMilestone]);
    const submissionsGw = createMockSubmissionsGateway();
    const view = await render(
      <WorkerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
        submissionsGateway={submissionsGw}
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
    const submissionsGw = createMockSubmissionsGateway();
    const view = await render(
      <WorkerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
        submissionsGateway={submissionsGw}
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
    const submissionsGw = createMockSubmissionsGateway();
    const view = await render(
      <WorkerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
        submissionsGateway={submissionsGw}
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
    const submissionsGw = createMockSubmissionsGateway();
    const view = await render(
      <WorkerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
        submissionsGateway={submissionsGw}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Begin This Step →")).toBeVisible();
    });

    await fireEvent.press(view.getByText("Begin This Step →"));

    expect(gateway.startMilestone).toHaveBeenCalledWith(mockMilestone.id);
    await waitFor(() => {
      expect(
        view.getByText("Milestone started! Keep up the progress."),
      ).toBeVisible();
    });
  });

  it("allows worker to submit completed work on active assignment", async () => {
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
      <WorkerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
        submissionsGateway={submissionsGw}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("SUBMIT COMPLETED WORK")).toBeVisible();
      expect(view.getByText("Submit Work for Review")).toBeVisible();
    });

    await fireEvent.changeText(
      view.getByLabelText("Completion notes"),
      "Finished assembling 4 desks.",
    );
    await fireEvent.press(view.getByText("Submit Work for Review"));

    expect(submissionsGw.submitAssignmentWork).toHaveBeenCalledWith({
      assignmentId: "90000000-0000-4000-8000-000000000001",
      note: "Finished assembling 4 desks.",
    });

    await waitFor(() => {
      expect(
        view.getByText("Work successfully submitted for employer review."),
      ).toBeVisible();
    });
  });

  it("renders revision requested banner with employer feedback", async () => {
    const revisionDetail: AssignmentDetail = {
      ...mockAssignmentDetail,
      assignment: {
        ...mockAssignmentDetail.assignment,
        status: "revision_requested",
      },
    };
    const revisionSubmission: SubmissionRecord = {
      ...mockSubmission,
      status: "revision_requested",
      reviewNote: "Desk 3 has loose screws. Please tighten.",
    };
    const gateway = createMockGateway(revisionDetail);
    const submissionsGw = createMockSubmissionsGateway([revisionSubmission]);

    const view = await render(
      <WorkerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
        submissionsGateway={submissionsGw}
      />,
    );

    await waitFor(() => {
      expect(view.getAllByText("REVISION REQUESTED")[0]).toBeVisible();
      expect(
        view.getByText('"Desk 3 has loose screws. Please tighten."'),
      ).toBeVisible();
      expect(view.getByText("Submit Revised Work")).toBeVisible();
    });
  });

  it("renders submitted status banner when under review", async () => {
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
      <WorkerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
        submissionsGateway={submissionsGw}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("WORK SUBMITTED · UNDER REVIEW")).toBeVisible();
      expect(
        view.getByText(
          '"All desks assembled and arranged in conference room."',
        ),
      ).toBeVisible();
    });
  });

  it("renders contract completed banner when completed", async () => {
    const completedDetail: AssignmentDetail = {
      ...mockAssignmentDetail,
      assignment: {
        ...mockAssignmentDetail.assignment,
        status: "completed",
      },
    };
    const approvedSubmission: SubmissionRecord = {
      ...mockSubmission,
      status: "approved",
      reviewNote: "Verified and accepted.",
    };
    const gateway = createMockGateway(completedDetail);
    const submissionsGw = createMockSubmissionsGateway([approvedSubmission]);

    const view = await render(
      <WorkerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
        submissionsGateway={submissionsGw}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("CONTRACT COMPLETED")).toBeVisible();
      expect(view.getByText('"Verified and accepted."')).toBeVisible();
    });
  });

  it("schedules local notification when agreement confirmed", async () => {
    const gateway = createMockGateway(mockAssignmentDetail);
    const submissionsGw = createMockSubmissionsGateway();
    const mockNotifications = {
      requestPermissions: jest.fn(async () => true),
      checkPermissions: jest.fn(async () => true),
      configureChannels: jest.fn(async () => {}),
      scheduleNotification: jest.fn(async () => "notif-id-2"),
      cancelAllNotifications: jest.fn(async () => {}),
    };

    const view = await render(
      <WorkerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
        submissionsGateway={submissionsGw}
        notifications={mockNotifications}
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Accept Agreement")).toBeVisible();
    });

    await fireEvent.press(view.getByText("Accept Agreement"));

    await waitFor(() => {
      expect(gateway.confirmAssignment).toHaveBeenCalled();
      expect(mockNotifications.scheduleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: "assignment_updates",
          title: "Agreement Confirmed",
        }),
      );
    });
  });

  it("attaches photo evidence and finalizes multi-step submission", async () => {
    const activeDetail: AssignmentDetail = {
      ...mockAssignmentDetail,
      assignment: {
        ...mockAssignmentDetail.assignment,
        status: "active",
      },
    };
    const gateway = createMockGateway(activeDetail);
    const submissionsGw = createMockSubmissionsGateway();
    const mockImageService = {
      pickImageFromLibrary: jest.fn(async () => ({
        uri: "file:///mock/desk_assembled.jpg",
        fileName: "desk_assembled.jpg",
        fileSize: 1048576,
        mimeType: "image/jpeg" as const,
        width: 1920,
        height: 1080,
      })),
      captureImageFromCamera: jest.fn(async () => null),
    };
    const mockNotifications = {
      requestPermissions: jest.fn(async () => true),
      checkPermissions: jest.fn(async () => true),
      configureChannels: jest.fn(async () => {}),
      scheduleNotification: jest.fn(async () => "notif-id-1"),
      cancelAllNotifications: jest.fn(async () => {}),
    };
    const mockBlob = {} as Blob;
    const mockBlobReader = jest.fn(async () => mockBlob);

    const view = await render(
      <WorkerAssignmentDetailScreen
        assignmentId="90000000-0000-4000-8000-000000000001"
        gateway={gateway}
        submissionsGateway={submissionsGw}
        imageService={mockImageService}
        notifications={mockNotifications}
        blobReader={mockBlobReader}
      />,
    );

    // Pick photo evidence
    await waitFor(() => {
      expect(view.getByLabelText("Pick photo from gallery")).toBeVisible();
    });

    fireEvent.press(view.getByLabelText("Pick photo from gallery"));

    await waitFor(() => {
      expect(view.getByText("desk_assembled.jpg")).toBeVisible();
    });

    // Enter completion note and submit
    fireEvent.changeText(
      view.getByLabelText("Completion notes"),
      "Desks assembled with evidence photo.",
    );
    fireEvent.press(view.getByLabelText("Submit work for review"));

    await waitFor(() => {
      expect(submissionsGw.beginSubmission).toHaveBeenCalled();
      expect(mockBlobReader).toHaveBeenCalledWith(
        "file:///mock/desk_assembled.jpg",
      );
      expect(submissionsGw.uploadEvidenceBlob).toHaveBeenCalled();
      expect(submissionsGw.finalizeSubmission).toHaveBeenCalled();
      expect(mockNotifications.scheduleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: "assignment_updates",
          title: "Work Submitted",
        }),
      );
      expect(
        view.getByText("Work successfully submitted for employer review."),
      ).toBeVisible();
    });
  });
});
