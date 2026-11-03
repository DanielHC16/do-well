import {
  transitionDemoState,
  type DemoAction,
  type DemoTransitionResult,
} from "./demo-reducer";
import type { DemoState } from "./demo-schema";
import { DEMO_EMPLOYER, DEMO_WORKER } from "./demo-state";

export type DemoIdKind = "gig" | "application" | "assignment" | "activity";

type CounterpartOptions = Readonly<{
  createId: (kind: DemoIdKind) => string;
  occurredAt: string;
  publishedGigIds?: readonly string[];
}>;

// Respond only as the other account. The active account keeps control of its
// own hiring, submission or approval step; no background timers are required.
export function advanceDemoCounterpart(
  initial: DemoState,
  {
    createId,
    occurredAt: requestedTime,
    publishedGigIds = [],
  }: CounterpartOptions,
): DemoTransitionResult {
  let state = initial;
  const previousTime = state.activity.at(-1)?.occurredAt;
  const occurredAt =
    previousTime && previousTime > requestedTime ? previousTime : requestedTime;
  function apply(action: DemoAction): DemoTransitionResult {
    const result = transitionDemoState(state, action);
    if (result.ok) state = result.state;
    return result;
  }

  if (state.activePersona === "employer") {
    for (const gigId of publishedGigIds) {
      const gig = state.gigs.find(({ id }) => id === gigId);
      if (
        gig?.status === "published" &&
        !state.applications.some(({ gigId }) => gigId === gig.id)
      ) {
        const result = apply({
          type: "APPLY_TO_GIG",
          actorId: DEMO_WORKER.id,
          application: {
            id: createId("application"),
            gigId: gig.id,
            workerId: DEMO_WORKER.id,
            message:
              "I can help with this job and complete the agreed work. I am ready to get started.",
            status: "pending",
            createdAt: occurredAt,
          },
          activityId: createId("activity"),
          occurredAt,
        });
        if (!result.ok) return result;
      }
    }
    for (const assignment of state.assignments) {
      if (assignment.status !== "active") continue;
      const title =
        state.gigs.find(({ id }) => id === assignment.gigId)?.title ??
        "the job";
      const result = apply({
        type: "SUBMIT_ASSIGNMENT",
        actorId: DEMO_WORKER.id,
        assignmentId: assignment.id,
        submissionNote: `Completed the agreed work for ${title}. Everything is ready for your review.`,
        submittedAt: occurredAt,
        activityId: createId("activity"),
      });
      if (!result.ok) return result;
    }
  } else {
    for (const application of state.applications) {
      if (application.status !== "pending") continue;
      const gig = state.gigs.find(({ id }) => id === application.gigId);
      if (
        !gig ||
        gig.status !== "published" ||
        state.assignments.some(({ gigId }) => gigId === gig.id)
      )
        continue;
      const result = apply({
        type: "SELECT_APPLICATION",
        actorId: DEMO_EMPLOYER.id,
        applicationId: application.id,
        assignment: {
          id: createId("assignment"),
          gigId: gig.id,
          employerId: gig.employerId,
          workerId: application.workerId,
          status: "active",
          submissionNote: null,
          submittedAt: null,
          completedAt: null,
        },
        activityId: createId("activity"),
        occurredAt,
      });
      if (!result.ok) return result;
    }
    for (const assignment of state.assignments) {
      if (assignment.status !== "submitted") continue;
      const result = apply({
        type: "APPROVE_ASSIGNMENT",
        actorId: DEMO_EMPLOYER.id,
        assignmentId: assignment.id,
        completedAt: occurredAt,
        activityId: createId("activity"),
      });
      if (!result.ok) return result;
    }
  }
  return { ok: true, state };
}
