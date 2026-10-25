import {
  ApproveSubmissionInputSchema,
  RequestRevisionInputSchema,
  SubmissionRecordSchema,
  SubmitWorkInputSchema,
} from "../submission-schemas";

describe("submission-schemas", () => {
  const validSubmission = {
    id: "a0000000-0000-4000-8000-000000000001",
    assignmentId: "a1000000-0000-4000-8000-000000000001",
    milestoneId: null,
    submittedBy: "a2000000-0000-4000-8000-000000000001",
    version: 1,
    note: "Completed initial cabling and rack mounting.",
    status: "submitted",
    reviewNote: null,
    submittedAt: "2026-10-25T01:00:00.000Z",
    reviewedAt: null,
    clientRequestId: "a3000000-0000-4000-8000-000000000001",
    createdAt: "2026-10-25T01:00:00.000Z",
    updatedAt: "2026-10-25T01:00:00.000Z",
  };

  it("parses valid SubmissionRecord", () => {
    const parsed = SubmissionRecordSchema.parse(validSubmission);
    expect(parsed.id).toBe(validSubmission.id);
    expect(parsed.version).toBe(1);
    expect(parsed.status).toBe("submitted");
  });

  it("rejects non-positive version number", () => {
    expect(() =>
      SubmissionRecordSchema.parse({
        ...validSubmission,
        version: 0,
      }),
    ).toThrow();
  });

  it("rejects invalid status", () => {
    expect(() =>
      SubmissionRecordSchema.parse({
        ...validSubmission,
        status: "invalid_status",
      }),
    ).toThrow();
  });

  it("validates SubmitWorkInputSchema", () => {
    const valid = SubmitWorkInputSchema.parse({
      assignmentId: "a1000000-0000-4000-8000-000000000001",
      note: "All tasks completed.",
    });
    expect(valid.assignmentId).toBe("a1000000-0000-4000-8000-000000000001");
    expect(valid.note).toBe("All tasks completed.");
  });

  it("rejects SubmitWorkInputSchema with invalid UUID", () => {
    expect(() =>
      SubmitWorkInputSchema.parse({
        assignmentId: "not-a-uuid",
      }),
    ).toThrow("Assignment ID must be a valid UUID.");
  });

  it("validates RequestRevisionInputSchema requiring non-empty review note", () => {
    const valid = RequestRevisionInputSchema.parse({
      submissionId: "a0000000-0000-4000-8000-000000000001",
      reviewNote: "Please re-check cable #3.",
    });
    expect(valid.reviewNote).toBe("Please re-check cable #3.");

    expect(() =>
      RequestRevisionInputSchema.parse({
        submissionId: "a0000000-0000-4000-8000-000000000001",
        reviewNote: "   ",
      }),
    ).toThrow("Please provide specific revision instructions.");
  });

  it("validates ApproveSubmissionInputSchema with optional review note", () => {
    const withNote = ApproveSubmissionInputSchema.parse({
      submissionId: "a0000000-0000-4000-8000-000000000001",
      reviewNote: "Great job!",
    });
    expect(withNote.reviewNote).toBe("Great job!");

    const withoutNote = ApproveSubmissionInputSchema.parse({
      submissionId: "a0000000-0000-4000-8000-000000000001",
    });
    expect(withoutNote.reviewNote).toBeUndefined();
  });
});
