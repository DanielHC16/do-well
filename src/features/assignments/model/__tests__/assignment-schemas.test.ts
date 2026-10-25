import {
  AssignmentDetailSchema,
  AssignmentRecordSchema,
  CreateMilestoneInputSchema,
  MilestoneRecordSchema,
} from "../assignment-schemas";

describe("assignment-schemas", () => {
  const validAssignment = {
    id: "90000000-0000-4000-8000-000000000001",
    gigId: "91000000-0000-4000-8000-000000000001",
    applicationId: "92000000-0000-4000-8000-000000000001",
    employerId: "80000000-0000-4000-8000-000000000001",
    workerId: "80000000-0000-4000-8000-000000000002",
    agreementVersion: 1,
    agreedTitle: "Makati Deep Cleaning",
    agreedDescription:
      "Thorough deep cleaning of kitchen and master bedroom floors.",
    agreedAmount: 1500,
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
  };

  it("validates a well-formed proposed assignment record", () => {
    const parsed = AssignmentRecordSchema.parse(validAssignment);
    expect(parsed.status).toBe("proposed");
    expect(parsed.agreedAmount).toBe(1500);
  });

  it("rejects non-PHP currency", () => {
    expect(() =>
      AssignmentRecordSchema.parse({
        ...validAssignment,
        currency: "USD",
      }),
    ).toThrow();
  });

  it("validates a milestone record", () => {
    const milestone = {
      id: "94000000-0000-4000-8000-000000000001",
      assignmentId: "90000000-0000-4000-8000-000000000001",
      position: 1,
      title: "Clean bathroom tiles",
      description: "Scrub and disinfect all tiles.",
      dueAt: null,
      status: "pending",
      approvedAt: null,
      createdAt: "2026-10-25T01:00:00.000Z",
      updatedAt: "2026-10-25T01:00:00.000Z",
    };
    const parsed = MilestoneRecordSchema.parse(milestone);
    expect(parsed.position).toBe(1);
    expect(parsed.status).toBe("pending");
  });

  it("validates CreateMilestoneInputSchema bounds", () => {
    const valid = CreateMilestoneInputSchema.parse({
      assignmentId: "90000000-0000-4000-8000-000000000001",
      title: "Initial setup",
      description: "Prepare materials",
    });
    expect(valid.title).toBe("Initial setup");

    expect(() =>
      CreateMilestoneInputSchema.parse({
        assignmentId: "90000000-0000-4000-8000-000000000001",
        title: "x",
      }),
    ).toThrow();
  });

  it("validates full AssignmentDetail", () => {
    const detail = {
      assignment: validAssignment,
      employer: {
        id: "80000000-0000-4000-8000-000000000001",
        displayName: "Maria Santos",
        homeArea: "Legazpi Village, Makati",
      },
      worker: {
        id: "80000000-0000-4000-8000-000000000002",
        displayName: "Juan dela Cruz",
        homeArea: "Poblacion, Makati",
      },
      gig: {
        id: "91000000-0000-4000-8000-000000000001",
        title: "Makati Deep Cleaning",
        category: "cleaning",
        workMode: "onsite",
        publicArea: "Legazpi Village, Makati",
      },
    };
    const parsed = AssignmentDetailSchema.parse(detail);
    expect(parsed.employer.displayName).toBe("Maria Santos");
    expect(parsed.worker.displayName).toBe("Juan dela Cruz");
  });
});
