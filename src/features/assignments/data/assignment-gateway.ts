import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/shared/api/supabase";
import { cacheStore, type CacheStore } from "@/shared/persistence/cache-store";
import type { Database } from "@/types/database.generated";

import {
  type ActivityEventRecord,
  ActivityEventRecordSchema,
  type AssignmentDetail,
  AssignmentDetailSchema,
  type AssignmentRecord,
  AssignmentRecordSchema,
  type CreateMilestoneInput,
  type MilestoneRecord,
  MilestoneRecordSchema,
} from "../model/assignment-schemas";

type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"];
type MilestoneRow = Database["public"]["Tables"]["milestones"]["Row"];
type ActivityRow =
  Database["public"]["Functions"]["list_user_activity"]["Returns"][number];

function mapAssignmentRow(row: AssignmentRow): AssignmentRecord {
  return AssignmentRecordSchema.parse({
    id: row.id,
    gigId: row.gig_id,
    applicationId: row.application_id,
    employerId: row.employer_id,
    workerId: row.worker_id,
    agreementVersion: row.agreement_version,
    agreedTitle: row.agreed_title,
    agreedDescription: row.agreed_description,
    agreedAmount: Number(row.agreed_amount),
    currency: row.currency as "PHP",
    dueAt: row.due_at,
    status: row.status,
    employerConfirmedAt: row.employer_confirmed_at,
    workerConfirmedAt: row.worker_confirmed_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    clientRequestId: row.client_request_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapMilestoneRow(row: MilestoneRow): MilestoneRecord {
  return MilestoneRecordSchema.parse({
    id: row.id,
    assignmentId: row.assignment_id,
    position: row.position,
    title: row.title,
    description: row.description,
    dueAt: row.due_at,
    status: row.status,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapActivityRow(row: ActivityRow): ActivityEventRecord {
  return ActivityEventRecordSchema.parse({
    id: row.id,
    eventType: row.event_type,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    dedupeKey: row.dedupe_key,
    readAt: row.read_at,
    createdAt: row.created_at,
    gigId: row.gig_id,
    assignmentId: row.assignment_id,
  });
}

export type AssignmentDetailResult = Readonly<{
  detail: AssignmentDetail;
  isFromCache: boolean;
  cachedAt?: string | null;
}>;

export type AssignmentGateway = Readonly<{
  confirmAssignment: (assignmentId: string) => Promise<AssignmentRecord>;
  declineAssignment: (assignmentId: string) => Promise<AssignmentRecord>;
  cancelProposedAssignment: (assignmentId: string) => Promise<AssignmentRecord>;
  createMilestone: (input: CreateMilestoneInput) => Promise<MilestoneRecord>;
  startMilestone: (milestoneId: string) => Promise<MilestoneRecord>;
  listMilestones: (assignmentId: string) => Promise<MilestoneRecord[]>;
  getAssignmentDetail: (
    assignmentId: string,
    userId?: string,
  ) => Promise<AssignmentDetail>;
  getAssignmentDetailWithMetadata: (
    assignmentId: string,
    userId?: string,
  ) => Promise<AssignmentDetailResult>;
  listUserActivity: (
    limit?: number,
    offset?: number,
  ) => Promise<ActivityEventRecord[]>;
  markActivityRead: (eventId: string) => Promise<ActivityEventRecord>;
}>;

// get_assignment_detail returns the assignment as to_jsonb(row), i.e. snake_case
// table columns, while its participant and gig objects are already camelCase.
function normalizeDetailPayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null) return data;
  const assignment = (data as { assignment?: unknown }).assignment;
  if (
    typeof assignment === "object" &&
    assignment !== null &&
    "gig_id" in assignment
  ) {
    return {
      ...data,
      assignment: mapAssignmentRow(assignment as AssignmentRow),
    };
  }
  return data;
}

function validateDetailIdentity(
  data: unknown,
  assignmentId: string,
  userId?: string,
): AssignmentDetail {
  const detail = AssignmentDetailSchema.parse(data);
  const { assignment, employer, worker, gig } = detail;
  if (
    assignment.id !== assignmentId ||
    assignment.employerId !== employer.id ||
    assignment.workerId !== worker.id ||
    assignment.gigId !== gig.id ||
    (userId !== undefined && userId !== employer.id && userId !== worker.id)
  ) {
    throw new Error("Assignment identity mismatch.");
  }
  return detail;
}

function isTransientReadFailure(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  // Explicit database/Auth/PostgREST errors cannot authorize an offline read.
  if ("code" in error && error.code !== undefined && error.code !== "")
    return false;
  if ("status" in error && (error.status === 401 || error.status === 403))
    return false;
  return (
    "message" in error &&
    typeof error.message === "string" &&
    /network|failed to fetch|fetch failed|timeout|timed out|connection lost/i.test(
      error.message,
    )
  );
}

export function createAssignmentGateway(
  client: SupabaseClient<Database>,
  cache: CacheStore = cacheStore,
): AssignmentGateway {
  return {
    async confirmAssignment(assignmentId: string): Promise<AssignmentRecord> {
      const { data, error } = await client.rpc("confirm_assignment", {
        p_assignment_id: assignmentId,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Failed to confirm assignment.");
      }

      return mapAssignmentRow(data);
    },

    async declineAssignment(assignmentId: string): Promise<AssignmentRecord> {
      const { data, error } = await client.rpc("decline_assignment", {
        p_assignment_id: assignmentId,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Failed to decline assignment.");
      }

      return mapAssignmentRow(data);
    },

    async cancelProposedAssignment(
      assignmentId: string,
    ): Promise<AssignmentRecord> {
      const { data, error } = await client.rpc("cancel_proposed_assignment", {
        p_assignment_id: assignmentId,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Failed to cancel assignment.");
      }

      return mapAssignmentRow(data);
    },

    async createMilestone(
      input: CreateMilestoneInput,
    ): Promise<MilestoneRecord> {
      const { data, error } = await client.rpc("create_assignment_milestone", {
        p_assignment_id: input.assignmentId,
        p_title: input.title,
        p_description: input.description ?? undefined,
        p_due_at: input.dueAt ?? undefined,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Failed to create milestone.");
      }

      return mapMilestoneRow(data);
    },

    async startMilestone(milestoneId: string): Promise<MilestoneRecord> {
      const { data, error } = await client.rpc("start_assignment_milestone", {
        p_milestone_id: milestoneId,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Failed to start milestone.");
      }

      return mapMilestoneRow(data);
    },

    async listMilestones(assignmentId: string): Promise<MilestoneRecord[]> {
      const { data, error } = await client.rpc("list_assignment_milestones", {
        p_assignment_id: assignmentId,
      });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map(mapMilestoneRow);
    },

    async getAssignmentDetailWithMetadata(
      assignmentId: string,
      userId?: string,
    ): Promise<AssignmentDetailResult> {
      const cacheKey = `assignment:detail:${assignmentId}`;

      async function cachedReadOrThrow(
        error: unknown,
      ): Promise<AssignmentDetailResult> {
        // Private records are never persisted/read without an explicit identity.
        if (userId && isTransientReadFailure(error)) {
          try {
            const cached = await cache.get<unknown>(userId, cacheKey);
            if (cached?.userId === userId) {
              return {
                detail: validateDetailIdentity(
                  cached.data,
                  assignmentId,
                  userId,
                ),
                isFromCache: true,
                cachedAt: cached.cachedAt,
              };
            }
          } catch {
            // Corrupt, mismatched, or inaccessible snapshots fail closed.
          }
        }
        throw new Error(
          "Assignment details could not be loaded. Check your connection or access and try again.",
        );
      }

      let result: Readonly<{ data: unknown; error: unknown }>;
      try {
        result = await client.rpc("get_assignment_detail", {
          p_assignment_id: assignmentId,
        });
      } catch (error) {
        return cachedReadOrThrow(error);
      }
      if (result.error) return cachedReadOrThrow(result.error);
      if (!result.data) throw new Error("Assignment details not found.");

      const parsed = validateDetailIdentity(
        normalizeDetailPayload(result.data),
        assignmentId,
        userId,
      );
      if (userId) {
        try {
          await cache.set(userId, cacheKey, parsed);
        } catch {
          // Best effort
        }
      }
      return { detail: parsed, isFromCache: false, cachedAt: null };
    },

    async getAssignmentDetail(
      assignmentId: string,
      userId?: string,
    ): Promise<AssignmentDetail> {
      const res = await this.getAssignmentDetailWithMetadata(
        assignmentId,
        userId,
      );
      return res.detail;
    },

    async listUserActivity(
      limit = 50,
      offset = 0,
    ): Promise<ActivityEventRecord[]> {
      const { data, error } = await client.rpc("list_user_activity", {
        p_limit: limit,
        p_offset: offset,
      });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map(mapActivityRow);
    },

    async markActivityRead(eventId: string): Promise<ActivityEventRecord> {
      const { data, error } = await client.rpc("mark_activity_read", {
        p_event_id: eventId,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Failed to mark activity event read.");
      }

      return ActivityEventRecordSchema.parse({
        id: data.id,
        eventType: data.event_type,
        payload: (data.payload ?? {}) as Record<string, unknown>,
        dedupeKey: data.dedupe_key,
        readAt: data.read_at,
        createdAt: data.created_at,
        gigId: data.gig_id,
        assignmentId: data.assignment_id,
      });
    },
  };
}

let defaultGateway: AssignmentGateway | undefined;

export function getAssignmentGateway(): AssignmentGateway {
  defaultGateway ??= createAssignmentGateway(getSupabaseClient());
  return defaultGateway;
}

export const assignmentGateway: AssignmentGateway = {
  confirmAssignment: (assignmentId) =>
    getAssignmentGateway().confirmAssignment(assignmentId),
  declineAssignment: (assignmentId) =>
    getAssignmentGateway().declineAssignment(assignmentId),
  cancelProposedAssignment: (assignmentId) =>
    getAssignmentGateway().cancelProposedAssignment(assignmentId),
  createMilestone: (input) => getAssignmentGateway().createMilestone(input),
  startMilestone: (milestoneId) =>
    getAssignmentGateway().startMilestone(milestoneId),
  listMilestones: (assignmentId) =>
    getAssignmentGateway().listMilestones(assignmentId),
  getAssignmentDetail: (assignmentId, userId) =>
    getAssignmentGateway().getAssignmentDetail(assignmentId, userId),
  getAssignmentDetailWithMetadata: (assignmentId, userId) =>
    getAssignmentGateway().getAssignmentDetailWithMetadata(
      assignmentId,
      userId,
    ),
  listUserActivity: (limit, offset) =>
    getAssignmentGateway().listUserActivity(limit, offset),
  markActivityRead: (eventId) =>
    getAssignmentGateway().markActivityRead(eventId),
};
