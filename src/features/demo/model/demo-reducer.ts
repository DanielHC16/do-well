import { z } from "zod";

import {
  DemoActivitySchema,
  DemoApplicationSchema,
  DemoAssignmentSchema,
  DemoGigSchema,
  DemoStateSchema,
  type DemoActivity,
  type DemoState,
} from "./demo-schema";
import { DEMO_EMPLOYER, DEMO_WORKER } from "./demo-state";

const idSchema = z.string().trim().min(1).max(120);
const timestampSchema = z.string().datetime({ offset: true });

export const DemoActionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("SET_ACTIVE_PERSONA"),
      persona: z.enum(["employer", "worker"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("CREATE_GIG"),
      actorId: idSchema,
      gig: DemoGigSchema,
      activityId: idSchema,
      occurredAt: timestampSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("APPLY_TO_GIG"),
      actorId: idSchema,
      application: DemoApplicationSchema,
      activityId: idSchema,
      occurredAt: timestampSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("SELECT_APPLICATION"),
      actorId: idSchema,
      applicationId: idSchema,
      assignment: DemoAssignmentSchema,
      activityId: idSchema,
      occurredAt: timestampSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("SUBMIT_ASSIGNMENT"),
      actorId: idSchema,
      assignmentId: idSchema,
      submissionNote: z.string().trim().min(3).max(1_000),
      submittedAt: timestampSchema,
      activityId: idSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("APPROVE_ASSIGNMENT"),
      actorId: idSchema,
      assignmentId: idSchema,
      completedAt: timestampSchema,
      activityId: idSchema,
    })
    .strict(),
]);

export type DemoAction = z.infer<typeof DemoActionSchema>;

export type DemoDomainErrorCode =
  | "INVALID_STATE"
  | "INVALID_ACTION"
  | "FORBIDDEN"
  | "DUPLICATE_ID"
  | "GIG_NOT_FOUND"
  | "GIG_NOT_PUBLISHED"
  | "DUPLICATE_APPLICATION"
  | "APPLICATION_NOT_FOUND"
  | "ASSIGNMENT_EXISTS"
  | "ASSIGNMENT_NOT_FOUND"
  | "INVALID_ASSIGNMENT_STATUS"
  | "ACTIVITY_OUT_OF_ORDER";

export type DemoDomainError = Readonly<{
  code: DemoDomainErrorCode;
  message: string;
}>;

export type DemoTransitionResult =
  | Readonly<{ ok: true; state: DemoState }>
  | Readonly<{ ok: false; error: DemoDomainError }>;

function failure(
  code: DemoDomainErrorCode,
  message: string,
): DemoTransitionResult {
  return { ok: false, error: { code, message } };
}

function roleForActor(actorId: string): "employer" | "worker" | null {
  if (actorId === DEMO_EMPLOYER.id) return "employer";
  if (actorId === DEMO_WORKER.id) return "worker";
  return null;
}

function appendActivity(
  state: DemoState,
  activity: DemoActivity,
): DemoTransitionResult | DemoState {
  if (state.activity.some(({ id }) => id === activity.id)) {
    return failure("DUPLICATE_ID", "That activity already exists.");
  }
  const previous = state.activity.at(-1);
  if (previous && activity.occurredAt < previous.occurredAt) {
    return failure(
      "ACTIVITY_OUT_OF_ORDER",
      "Activity must be recorded in chronological order.",
    );
  }
  return { ...state, activity: [...state.activity, activity] };
}

function success(state: DemoState): DemoTransitionResult {
  const parsed = DemoStateSchema.safeParse(state);
  return parsed.success
    ? { ok: true, state: parsed.data }
    : failure("INVALID_STATE", "The requested change could not be completed.");
}

function withActivity(
  state: DemoState,
  activityInput: DemoActivity,
): DemoTransitionResult {
  const activity = DemoActivitySchema.parse(activityInput);
  const next = appendActivity(state, activity);
  return "ok" in next ? next : success(next);
}

export function transitionDemoState(
  stateInput: unknown,
  actionInput: unknown,
): DemoTransitionResult {
  const stateResult = DemoStateSchema.safeParse(stateInput);
  if (!stateResult.success) {
    return failure("INVALID_STATE", "Your saved data could not be read.");
  }
  const actionResult = DemoActionSchema.safeParse(actionInput);
  if (!actionResult.success) {
    return failure("INVALID_ACTION", "The requested action is invalid.");
  }

  const state = stateResult.data;
  const action = actionResult.data;

  switch (action.type) {
    case "SET_ACTIVE_PERSONA":
      return success({ ...state, activePersona: action.persona });

    case "CREATE_GIG": {
      if (
        roleForActor(action.actorId) !== "employer" ||
        action.gig.employerId !== action.actorId
      ) {
        return failure("FORBIDDEN", "Only the employer can publish a gig.");
      }
      if (action.gig.status !== "published") {
        return failure("INVALID_ACTION", "New gigs must be published.");
      }
      if (state.gigs.some(({ id }) => id === action.gig.id)) {
        return failure("DUPLICATE_ID", "That gig already exists.");
      }
      return withActivity(
        { ...state, gigs: [...state.gigs, action.gig] },
        {
          id: action.activityId,
          gigId: action.gig.id,
          assignmentId: null,
          actor: "employer",
          type: "gig_published",
          summary: `Published ${action.gig.title}.`,
          occurredAt: action.occurredAt,
        },
      );
    }

    case "APPLY_TO_GIG": {
      if (
        roleForActor(action.actorId) !== "worker" ||
        action.application.workerId !== action.actorId
      ) {
        return failure("FORBIDDEN", "Only the worker can apply.");
      }
      const gig = state.gigs.find(({ id }) => id === action.application.gigId);
      if (!gig) return failure("GIG_NOT_FOUND", "The gig does not exist.");
      if (gig.status !== "published") {
        return failure(
          "GIG_NOT_PUBLISHED",
          "The gig is not accepting applications.",
        );
      }
      if (action.application.status !== "pending") {
        return failure("INVALID_ACTION", "New applications must be pending.");
      }
      if (
        state.applications.some(
          ({ gigId, workerId }) =>
            gigId === action.application.gigId &&
            workerId === action.application.workerId,
        )
      ) {
        return failure(
          "DUPLICATE_APPLICATION",
          "You have already applied to this gig.",
        );
      }
      if (state.applications.some(({ id }) => id === action.application.id)) {
        return failure("DUPLICATE_ID", "That application already exists.");
      }
      return withActivity(
        { ...state, applications: [...state.applications, action.application] },
        {
          id: action.activityId,
          gigId: gig.id,
          assignmentId: null,
          actor: "worker",
          type: "application_submitted",
          summary: `Applied to ${gig.title}.`,
          occurredAt: action.occurredAt,
        },
      );
    }

    case "SELECT_APPLICATION": {
      const application = state.applications.find(
        ({ id }) => id === action.applicationId,
      );
      if (!application) {
        return failure(
          "APPLICATION_NOT_FOUND",
          "The application does not exist.",
        );
      }
      const gig = state.gigs.find(({ id }) => id === application.gigId);
      if (!gig) return failure("GIG_NOT_FOUND", "The gig does not exist.");
      if (action.actorId !== gig.employerId) {
        return failure("FORBIDDEN", "Only the gig owner can select a worker.");
      }
      if (
        state.assignments.some(({ gigId }) => gigId === gig.id) ||
        gig.status !== "published"
      ) {
        return failure(
          "ASSIGNMENT_EXISTS",
          "This gig already has an assignment.",
        );
      }
      if (
        action.assignment.status !== "active" ||
        action.assignment.gigId !== gig.id ||
        action.assignment.employerId !== gig.employerId ||
        action.assignment.workerId !== application.workerId
      ) {
        return failure(
          "INVALID_ACTION",
          "The assignment does not match the selected application.",
        );
      }
      if (state.assignments.some(({ id }) => id === action.assignment.id)) {
        return failure("DUPLICATE_ID", "That assignment already exists.");
      }
      const nextState: DemoState = {
        ...state,
        gigs: state.gigs.map((item) =>
          item.id === gig.id ? { ...item, status: "assigned" as const } : item,
        ),
        applications: state.applications.map((item) =>
          item.id === application.id
            ? { ...item, status: "accepted" as const }
            : item,
        ),
        assignments: [...state.assignments, action.assignment],
      };
      return withActivity(nextState, {
        id: action.activityId,
        gigId: gig.id,
        assignmentId: action.assignment.id,
        actor: "employer",
        type: "worker_selected",
        summary: `Selected ${DEMO_WORKER.displayName} for ${gig.title}.`,
        occurredAt: action.occurredAt,
      });
    }

    case "SUBMIT_ASSIGNMENT": {
      const assignment = state.assignments.find(
        ({ id }) => id === action.assignmentId,
      );
      if (!assignment) {
        return failure(
          "ASSIGNMENT_NOT_FOUND",
          "The assignment does not exist.",
        );
      }
      if (assignment.workerId !== action.actorId) {
        return failure(
          "FORBIDDEN",
          "Only the selected worker can submit work.",
        );
      }
      if (assignment.status !== "active") {
        return failure(
          "INVALID_ASSIGNMENT_STATUS",
          "Only active assignments can be submitted.",
        );
      }
      const nextState: DemoState = {
        ...state,
        assignments: state.assignments.map((item) =>
          item.id === assignment.id
            ? {
                ...item,
                status: "submitted" as const,
                submissionNote: action.submissionNote,
                submittedAt: action.submittedAt,
              }
            : item,
        ),
      };
      return withActivity(nextState, {
        id: action.activityId,
        gigId: assignment.gigId,
        assignmentId: assignment.id,
        actor: "worker",
        type: "work_submitted",
        summary: "Submitted work for employer review.",
        occurredAt: action.submittedAt,
      });
    }

    case "APPROVE_ASSIGNMENT": {
      const assignment = state.assignments.find(
        ({ id }) => id === action.assignmentId,
      );
      if (!assignment) {
        return failure(
          "ASSIGNMENT_NOT_FOUND",
          "The assignment does not exist.",
        );
      }
      if (assignment.employerId !== action.actorId) {
        return failure(
          "FORBIDDEN",
          "Only the gig owner can approve submitted work.",
        );
      }
      if (assignment.status !== "submitted") {
        return failure(
          "INVALID_ASSIGNMENT_STATUS",
          "Work must be submitted before it can be approved.",
        );
      }
      const nextState: DemoState = {
        ...state,
        gigs: state.gigs.map((gig) =>
          gig.id === assignment.gigId
            ? { ...gig, status: "completed" as const }
            : gig,
        ),
        assignments: state.assignments.map((item) =>
          item.id === assignment.id
            ? {
                ...item,
                status: "completed" as const,
                completedAt: action.completedAt,
              }
            : item,
        ),
      };
      return withActivity(nextState, {
        id: action.activityId,
        gigId: assignment.gigId,
        assignmentId: assignment.id,
        actor: "employer",
        type: "work_approved",
        summary: "Approved the submitted work and completed the gig.",
        occurredAt: action.completedAt,
      });
    }
  }
}
