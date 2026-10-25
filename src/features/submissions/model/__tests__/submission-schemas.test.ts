import {
  BeginSubmissionInputSchema,
  FinalizeSubmissionInputSchema,
  SelectedEvidenceImageSchema,
  SubmissionFileRecordSchema,
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
        assignmentId: "invalid-uuid",
        note: "Note",
      }),
    ).toThrow();
  });

  it("validates BeginSubmissionInputSchema", () => {
    const parsed = BeginSubmissionInputSchema.parse({
      assignmentId: "a1000000-0000-4000-8000-000000000001",
      note: "Work done, uploading photos",
    });
    expect(parsed.assignmentId).toBe("a1000000-0000-4000-8000-000000000001");
    expect(parsed.note).toBe("Work done, uploading photos");
  });

  it("validates FinalizeSubmissionInputSchema", () => {
    const parsed = FinalizeSubmissionInputSchema.parse({
      submissionId: "a0000000-0000-4000-8000-000000000001",
      files: [
        {
          object_path: "user1/assignment1/sub1/photo.jpg",
          media_type: "image/jpeg",
          size_bytes: 1048576,
        },
      ],
    });
    expect(parsed.files).toHaveLength(1);
    expect(parsed.files[0].media_type).toBe("image/jpeg");
  });

  it("validates SubmissionFileRecordSchema", () => {
    const valid = {
      id: "f0000000-0000-4000-8000-000000000001",
      submissionId: "a0000000-0000-4000-8000-000000000001",
      uploaderId: "a2000000-0000-4000-8000-000000000001",
      objectPath: "u1/a1/s1/pic.jpg",
      mediaType: "image/jpeg",
      sizeBytes: 2048500,
      createdAt: "2026-10-25T02:00:00.000Z",
      updatedAt: "2026-10-25T02:00:00.000Z",
    };
    const parsed = SubmissionFileRecordSchema.parse(valid);
    expect(parsed.mediaType).toBe("image/jpeg");
    expect(parsed.sizeBytes).toBe(2048500);
  });

  it("rejects SubmissionFileRecordSchema with invalid media type or oversized bytes", () => {
    expect(() =>
      SubmissionFileRecordSchema.parse({
        id: "f0000000-0000-4000-8000-000000000001",
        submissionId: "a0000000-0000-4000-8000-000000000001",
        uploaderId: "a2000000-0000-4000-8000-000000000001",
        objectPath: "u1/a1/s1/bad.exe",
        mediaType: "application/octet-stream",
        sizeBytes: 1024,
        createdAt: "2026-10-25T02:00:00.000Z",
        updatedAt: "2026-10-25T02:00:00.000Z",
      }),
    ).toThrow();

    expect(() =>
      SubmissionFileRecordSchema.parse({
        id: "f0000000-0000-4000-8000-000000000001",
        submissionId: "a0000000-0000-4000-8000-000000000001",
        uploaderId: "a2000000-0000-4000-8000-000000000001",
        objectPath: "u1/a1/s1/huge.png",
        mediaType: "image/png",
        sizeBytes: 10000000,
        createdAt: "2026-10-25T02:00:00.000Z",
        updatedAt: "2026-10-25T02:00:00.000Z",
      }),
    ).toThrow();
  });

  it("validates SelectedEvidenceImageSchema", () => {
    const valid = {
      uri: "file:///data/user/0/com.app/cache/photo.jpg",
      fileName: "photo.jpg",
      fileSize: 1024000,
      mimeType: "image/jpeg",
      width: 1920,
      height: 1080,
    };
    const parsed = SelectedEvidenceImageSchema.parse(valid);
    expect(parsed.fileName).toBe("photo.jpg");
    expect(parsed.width).toBe(1920);
  });
});
