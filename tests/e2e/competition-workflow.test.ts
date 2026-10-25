import {
  transitionDemoState,
  type DemoTransitionResult,
} from "../../src/features/demo/model/demo-reducer";
import {
  createEmptyDemoState,
  DEMO_EMPLOYER,
  DEMO_WORKER,
} from "../../src/features/demo/model/demo-state";

describe("E2E: Competition Showcase Workflow (Full P0 Multi-Role Scenario)", () => {
  it("executes complete lifecycle: gig creation -> worker application -> selection -> submission -> approval", () => {
    // 0. Initialize fresh state
    let state = createEmptyDemoState();
    expect(state.gigs).toHaveLength(0);
    expect(state.assignments).toHaveLength(0);
    expect(state.activity).toHaveLength(0);

    const gigId = "gig-e2e-showcase-01";
    const applicationId = "app-e2e-showcase-01";
    const assignmentId = "asg-e2e-showcase-01";

    const times = {
      published: "2026-10-25T01:00:00.000Z",
      applied: "2026-10-25T01:01:00.000Z",
      selected: "2026-10-25T01:02:00.000Z",
      submitted: "2026-10-25T01:03:00.000Z",
      approved: "2026-10-25T01:04:00.000Z",
    } as const;

    // STEP 1: Employer Maya posts a community gig
    let result: DemoTransitionResult = transitionDemoState(state, {
      type: "CREATE_GIG",
      actorId: DEMO_EMPLOYER.id,
      gig: {
        id: gigId,
        employerId: DEMO_EMPLOYER.id,
        title: "Grocery Assistance & Delivery",
        description:
          "Help purchasing and delivering groceries to an elderly neighbor in Poblacion.",
        category: "errands",
        workMode: "onsite",
        publicArea: "Poblacion, Makati",
        budgetAmount: 450,
        status: "published",
        createdAt: times.published,
      },
      activityId: "act-01",
      occurredAt: times.published,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    state = result.state;
    expect(state.gigs).toHaveLength(1);
    expect(state.gigs[0].status).toBe("published");
    expect(state.activity).toHaveLength(1);
    expect(state.activity[0].type).toBe("gig_published");

    // Negative Assertion: Worker cannot post as employer
    const invalidWorkerPost = transitionDemoState(state, {
      type: "CREATE_GIG",
      actorId: DEMO_WORKER.id,
      gig: {
        id: "invalid-gig",
        employerId: DEMO_WORKER.id,
        title: "Worker trying to act as employer",
        description: "Invalid action description.",
        category: "errands",
        workMode: "onsite",
        publicArea: "Makati",
        budgetAmount: 300,
        status: "published",
        createdAt: times.published,
      },
      activityId: "act-neg-01",
      occurredAt: times.published,
    });
    expect(invalidWorkerPost.ok).toBe(false);

    // STEP 2: Worker Alex discovers the gig and applies
    result = transitionDemoState(state, {
      type: "APPLY_TO_GIG",
      actorId: DEMO_WORKER.id,
      application: {
        id: applicationId,
        gigId,
        workerId: DEMO_WORKER.id,
        message:
          "I am nearby in Poblacion with a bicycle and can purchase and deliver this promptly.",
        status: "pending",
        createdAt: times.applied,
      },
      activityId: "act-02",
      occurredAt: times.applied,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    state = result.state;
    expect(state.applications).toHaveLength(1);
    expect(state.applications[0].workerId).toBe(DEMO_WORKER.id);
    expect(state.activity).toHaveLength(2);

    // Negative Assertion: Worker cannot apply twice to the same gig
    const duplicateApply = transitionDemoState(state, {
      type: "APPLY_TO_GIG",
      actorId: DEMO_WORKER.id,
      application: {
        id: "duplicate-app-01",
        gigId,
        workerId: DEMO_WORKER.id,
        message: "Trying to submit a duplicate bid on the same gig.",
        status: "pending",
        createdAt: times.applied,
      },
      activityId: "act-neg-02",
      occurredAt: times.applied,
    });
    expect(duplicateApply.ok).toBe(false);

    // STEP 3: Employer selects Alex, creating the agreement & assignment
    result = transitionDemoState(state, {
      type: "SELECT_APPLICATION",
      actorId: DEMO_EMPLOYER.id,
      applicationId,
      assignment: {
        id: assignmentId,
        gigId,
        employerId: DEMO_EMPLOYER.id,
        workerId: DEMO_WORKER.id,
        status: "active",
        submissionNote: null,
        submittedAt: null,
        completedAt: null,
      },
      activityId: "act-03",
      occurredAt: times.selected,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    state = result.state;
    expect(state.assignments).toHaveLength(1);
    expect(state.assignments[0].status).toBe("active");
    expect(state.gigs[0].status).toBe("assigned");
    expect(state.activity).toHaveLength(3);

    // STEP 4: Worker completes work and submits evidence note
    result = transitionDemoState(state, {
      type: "SUBMIT_ASSIGNMENT",
      actorId: DEMO_WORKER.id,
      assignmentId,
      submissionNote:
        "Groceries bought according to list and delivered in person with receipt handed over.",
      submittedAt: times.submitted,
      activityId: "act-04",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    state = result.state;
    expect(state.assignments[0].status).toBe("submitted");
    expect(state.assignments[0].submissionNote).toContain("Groceries bought");
    expect(state.activity).toHaveLength(4);

    // Negative Assertion: Worker cannot approve their own submission
    const unauthorizedApproval = transitionDemoState(state, {
      type: "APPROVE_ASSIGNMENT",
      actorId: DEMO_WORKER.id,
      assignmentId,
      completedAt: times.approved,
      activityId: "act-neg-03",
    });
    expect(unauthorizedApproval.ok).toBe(false);

    // STEP 5: Employer approves submission, completing the contract
    result = transitionDemoState(state, {
      type: "APPROVE_ASSIGNMENT",
      actorId: DEMO_EMPLOYER.id,
      assignmentId,
      completedAt: times.approved,
      activityId: "act-05",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    state = result.state;
    expect(state.assignments[0].status).toBe("completed");
    expect(state.gigs[0].status).toBe("completed");
    expect(state.activity).toHaveLength(5);
    expect(state.activity[4].type).toBe("work_approved");
  });
});
