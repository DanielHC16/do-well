import {
  ApplicantSummarySchema,
  ApplicationRecordSchema,
  ApplyToGigFormSchema,
  AssignmentRecordSchema,
} from "../application-schemas";

describe("Application schemas", () => {
  it("validates valid ApplicationRecord", () => {
    const valid = {
      id: "a0000000-0000-4000-8000-000000000001",
      gigId: "b0000000-0000-4000-8000-000000000001",
      workerId: "c0000000-0000-4000-8000-000000000001",
      message: "Experienced in warehouse sorting.",
      status: "pending",
      clientRequestId: "d0000000-0000-4000-8000-000000000001",
      decidedAt: null,
      createdAt: "2026-10-25T01:00:00.000Z",
      updatedAt: "2026-10-25T01:00:00.000Z",
    };

    expect(ApplicationRecordSchema.parse(valid)).toEqual(valid);
  });

  it("validates valid ApplicantSummary with display name and area", () => {
    const valid = {
      id: "a0000000-0000-4000-8000-000000000001",
      gigId: "b0000000-0000-4000-8000-000000000001",
      workerId: "c0000000-0000-4000-8000-000000000001",
      message: "Can start today.",
      status: "pending",
      decidedAt: null,
      createdAt: "2026-10-25T01:00:00.000Z",
      workerDisplayName: "Warren Worker",
      workerHomeArea: "Makati",
    };

    expect(ApplicantSummarySchema.parse(valid)).toEqual(valid);
  });

  it("validates valid AssignmentRecord", () => {
    const valid = {
      id: "e0000000-0000-4000-8000-000000000001",
      gigId: "b0000000-0000-4000-8000-000000000001",
      applicationId: "a0000000-0000-4000-8000-000000000001",
      employerId: "f0000000-0000-4000-8000-000000000001",
      workerId: "c0000000-0000-4000-8000-000000000001",
      agreementVersion: 1,
      agreedTitle: "Warehouse Inventory Sorting",
      agreedDescription:
        "Help sort delivered boxes and label inventory shelves with care.",
      agreedAmount: 950,
      currency: "PHP" as const,
      dueAt: null,
      status: "proposed" as const,
      employerConfirmedAt: "2026-10-25T01:00:00.000Z",
      workerConfirmedAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      clientRequestId: "d0000000-0000-4000-8000-000000000002",
      createdAt: "2026-10-25T01:00:00.000Z",
      updatedAt: "2026-10-25T01:00:00.000Z",
    };

    expect(AssignmentRecordSchema.parse(valid)).toEqual(valid);
  });

  it("validates ApplyToGigFormSchema and trims message", () => {
    const parsed = ApplyToGigFormSchema.parse({
      message: "  Available this weekend.  ",
    });
    expect(parsed.message).toBe("Available this weekend.");

    const empty = ApplyToGigFormSchema.parse({});
    expect(empty.message).toBe("");

    expect(() =>
      ApplyToGigFormSchema.parse({
        message: "a".repeat(1001),
      }),
    ).toThrow();
  });
});
