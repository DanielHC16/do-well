import {
  createEmptyDemoState,
  DEMO_EMPLOYER,
  DEMO_WORKER,
} from "../demo-state";
import { transitionDemoState, type DemoAction } from "../demo-reducer";

const times = {
  published: "2026-10-25T01:00:00.000Z",
  applied: "2026-10-25T01:01:00.000Z",
  selected: "2026-10-25T01:02:00.000Z",
  submitted: "2026-10-25T01:03:00.000Z",
  approved: "2026-10-25T01:04:00.000Z",
} as const;

const gig = {
  id: "gig-new",
  employerId: DEMO_EMPLOYER.id,
  title: "Deliver event supplies",
  description: "Bring sealed event supplies to the community hall.",
  category: "delivery",
  workMode: "onsite" as const,
  publicArea: "Manila",
  budgetAmount: 750,
  status: "published" as const,
  createdAt: times.published,
};

const application = {
  id: "application-new",
  gigId: gig.id,
  workerId: DEMO_WORKER.id,
  message: "I can complete this delivery today.",
  status: "pending" as const,
  createdAt: times.applied,
};

const assignment = {
  id: "assignment-new",
  gigId: gig.id,
  employerId: DEMO_EMPLOYER.id,
  workerId: DEMO_WORKER.id,
  status: "active" as const,
  submissionNote: null,
  submittedAt: null,
  completedAt: null,
};

function expectSuccess(state: unknown, action: DemoAction) {
  const result = transitionDemoState(state, action);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

function createGig(state = createEmptyDemoState()) {
  return expectSuccess(state, {
    type: "CREATE_GIG",
    actorId: DEMO_EMPLOYER.id,
    gig,
    activityId: "activity-published",
    occurredAt: times.published,
  });
}

function applyToGig(state = createGig()) {
  return expectSuccess(state, {
    type: "APPLY_TO_GIG",
    actorId: DEMO_WORKER.id,
    application,
    activityId: "activity-applied",
    occurredAt: times.applied,
  });
}

function selectWorker(state = applyToGig()) {
  return expectSuccess(state, {
    type: "SELECT_APPLICATION",
    actorId: DEMO_EMPLOYER.id,
    applicationId: application.id,
    assignment,
    activityId: "activity-selected",
    occurredAt: times.selected,
  });
}

describe("demo gig lifecycle", () => {
  it("creates and publishes a valid gig with ordered activity", () => {
    const state = createGig();

    expect(state.gigs).toEqual([gig]);
    expect(state.activity).toEqual([
      expect.objectContaining({
        id: "activity-published",
        actor: "employer",
        type: "gig_published",
        occurredAt: times.published,
      }),
    ]);
  });

  it("allows only one application per worker and gig", () => {
    const applied = applyToGig();
    const duplicate = transitionDemoState(applied, {
      type: "APPLY_TO_GIG",
      actorId: DEMO_WORKER.id,
      application: { ...application, id: "application-duplicate" },
      activityId: "activity-duplicate",
      occurredAt: times.selected,
    });

    expect(duplicate).toMatchObject({
      ok: false,
      error: { code: "DUPLICATE_APPLICATION" },
    });
    expect(applied.applications).toHaveLength(1);
  });

  it("selects one worker atomically and prevents a second assignment", () => {
    const selected = selectWorker();

    expect(selected.gigs[0]?.status).toBe("assigned");
    expect(selected.applications[0]?.status).toBe("accepted");
    expect(selected.assignments).toEqual([assignment]);
    expect(selected.activity.at(-1)?.type).toBe("worker_selected");

    const second = transitionDemoState(selected, {
      type: "SELECT_APPLICATION",
      actorId: DEMO_EMPLOYER.id,
      applicationId: application.id,
      assignment: { ...assignment, id: "assignment-second" },
      activityId: "activity-second-selection",
      occurredAt: times.submitted,
    });
    expect(second).toMatchObject({
      ok: false,
      error: { code: "ASSIGNMENT_EXISTS" },
    });
    expect(selected.assignments).toHaveLength(1);
  });

  it("allows only the selected worker to submit and the owner to approve", () => {
    const selected = selectWorker();
    const unauthorizedSubmit = transitionDemoState(selected, {
      type: "SUBMIT_ASSIGNMENT",
      actorId: "another-worker",
      assignmentId: assignment.id,
      submissionNote: "Done.",
      submittedAt: times.submitted,
      activityId: "activity-bad-submit",
    });
    expect(unauthorizedSubmit).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });

    const submitted = expectSuccess(selected, {
      type: "SUBMIT_ASSIGNMENT",
      actorId: DEMO_WORKER.id,
      assignmentId: assignment.id,
      submissionNote: "Supplies delivered to the event coordinator.",
      submittedAt: times.submitted,
      activityId: "activity-submitted",
    });
    expect(submitted.assignments[0]).toMatchObject({
      status: "submitted",
      submittedAt: times.submitted,
    });

    const unauthorizedApproval = transitionDemoState(submitted, {
      type: "APPROVE_ASSIGNMENT",
      actorId: "another-employer",
      assignmentId: assignment.id,
      completedAt: times.approved,
      activityId: "activity-bad-approval",
    });
    expect(unauthorizedApproval).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });

    const completed = expectSuccess(submitted, {
      type: "APPROVE_ASSIGNMENT",
      actorId: DEMO_EMPLOYER.id,
      assignmentId: assignment.id,
      completedAt: times.approved,
      activityId: "activity-approved",
    });
    expect(completed.assignments[0]?.status).toBe("completed");
    expect(completed.gigs[0]?.status).toBe("completed");
    expect(completed.activity.map(({ type }) => type)).toEqual([
      "gig_published",
      "application_submitted",
      "worker_selected",
      "work_submitted",
      "work_approved",
    ]);
  });

  it.each([
    [
      "non-owner gig creation",
      createEmptyDemoState(),
      {
        type: "CREATE_GIG",
        actorId: DEMO_WORKER.id,
        gig,
        activityId: "bad-activity",
        occurredAt: times.published,
      },
      "FORBIDDEN",
    ],
    [
      "application to a missing gig",
      createEmptyDemoState(),
      {
        type: "APPLY_TO_GIG",
        actorId: DEMO_WORKER.id,
        application,
        activityId: "bad-activity",
        occurredAt: times.applied,
      },
      "GIG_NOT_FOUND",
    ],
    [
      "selection by a non-owner",
      applyToGig(),
      {
        type: "SELECT_APPLICATION",
        actorId: "another-employer",
        applicationId: application.id,
        assignment,
        activityId: "bad-activity",
        occurredAt: times.selected,
      },
      "FORBIDDEN",
    ],
    [
      "submission before selection",
      applyToGig(),
      {
        type: "SUBMIT_ASSIGNMENT",
        actorId: DEMO_WORKER.id,
        assignmentId: assignment.id,
        submissionNote: "Done.",
        submittedAt: times.submitted,
        activityId: "bad-activity",
      },
      "ASSIGNMENT_NOT_FOUND",
    ],
    [
      "approval before submission",
      selectWorker(),
      {
        type: "APPROVE_ASSIGNMENT",
        actorId: DEMO_EMPLOYER.id,
        assignmentId: assignment.id,
        completedAt: times.approved,
        activityId: "bad-activity",
      },
      "INVALID_ASSIGNMENT_STATUS",
    ],
  ])("rejects %s without mutating state", (_label, state, action, code) => {
    const before = structuredClone(state);
    const result = transitionDemoState(state, action);
    expect(result).toMatchObject({ ok: false, error: { code } });
    expect(state).toEqual(before);
  });

  it("rejects malformed state and actions with typed errors", () => {
    expect(transitionDemoState({}, { type: "UNKNOWN" })).toMatchObject({
      ok: false,
      error: { code: "INVALID_STATE" },
    });
    expect(transitionDemoState(createEmptyDemoState(), {})).toMatchObject({
      ok: false,
      error: { code: "INVALID_ACTION" },
    });
  });

  it("rejects activity timestamps that would break chronological ordering", () => {
    const state = createGig();
    const result = transitionDemoState(state, {
      type: "APPLY_TO_GIG",
      actorId: DEMO_WORKER.id,
      application: { ...application, createdAt: times.published },
      activityId: "activity-out-of-order",
      occurredAt: "2026-10-25T00:59:00.000Z",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "ACTIVITY_OUT_OF_ORDER" },
    });
  });
});
