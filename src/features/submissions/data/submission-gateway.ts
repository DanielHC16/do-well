import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/shared/api/supabase";
import type { Database } from "@/types/database.generated";

import {
  type ApproveSubmissionInput,
  ApproveSubmissionInputSchema,
  type RequestRevisionInput,
  RequestRevisionInputSchema,
  type SubmissionRecord,
  SubmissionRecordSchema,
  type SubmitWorkInput,
  SubmitWorkInputSchema,
} from "../model/submission-schemas";

type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];

function mapSubmissionRow(row: SubmissionRow): SubmissionRecord {
  return SubmissionRecordSchema.parse({
    id: row.id,
    assignmentId: row.assignment_id,
    milestoneId: row.milestone_id,
    submittedBy: row.submitted_by,
    version: row.version,
    note: row.note,
    status: row.status,
    reviewNote: row.review_note,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    clientRequestId: row.client_request_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export type SubmissionGateway = Readonly<{
  submitAssignmentWork: (input: SubmitWorkInput) => Promise<SubmissionRecord>;
  requestSubmissionRevision: (
    input: RequestRevisionInput,
  ) => Promise<SubmissionRecord>;
  approveAssignmentCompletion: (
    input: ApproveSubmissionInput,
  ) => Promise<SubmissionRecord>;
  listAssignmentSubmissions: (
    assignmentId: string,
  ) => Promise<SubmissionRecord[]>;
  getLatestAssignmentSubmission: (
    assignmentId: string,
  ) => Promise<SubmissionRecord | null>;
}>;

export function createSubmissionGateway(
  client: SupabaseClient<Database>,
): SubmissionGateway {
  return {
    async submitAssignmentWork(input: SubmitWorkInput) {
      const validated = SubmitWorkInputSchema.parse(input);
      const clientRequestId =
        validated.clientRequestId ??
        globalThis.crypto?.randomUUID?.() ??
        "00000000-0000-4000-8000-000000000000";

      const { data, error } = await client.rpc("submit_assignment_work", {
        p_assignment_id: validated.assignmentId,
        p_note: validated.note ?? undefined,
        p_milestone_id: validated.milestoneId ?? undefined,
        p_client_request_id: clientRequestId,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Failed to submit work: no record returned.");
      }

      return mapSubmissionRow(data as SubmissionRow);
    },

    async requestSubmissionRevision(input: RequestRevisionInput) {
      const validated = RequestRevisionInputSchema.parse(input);

      const { data, error } = await client.rpc("request_submission_revision", {
        p_submission_id: validated.submissionId,
        p_review_note: validated.reviewNote,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Failed to request revision: no record returned.");
      }

      return mapSubmissionRow(data as SubmissionRow);
    },

    async approveAssignmentCompletion(input: ApproveSubmissionInput) {
      const validated = ApproveSubmissionInputSchema.parse(input);

      const { data, error } = await client.rpc(
        "approve_assignment_completion",
        {
          p_submission_id: validated.submissionId,
          p_review_note: validated.reviewNote ?? undefined,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Failed to approve completion: no record returned.");
      }

      return mapSubmissionRow(data as SubmissionRow);
    },

    async listAssignmentSubmissions(assignmentId: string) {
      const { data, error } = await client.rpc("list_assignment_submissions", {
        p_assignment_id: assignmentId,
      });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map((row) => mapSubmissionRow(row as SubmissionRow));
    },

    async getLatestAssignmentSubmission(assignmentId: string) {
      const { data, error } = await client.rpc(
        "get_latest_assignment_submission",
        {
          p_assignment_id: assignmentId,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return null;
      }

      return mapSubmissionRow(data as SubmissionRow);
    },
  };
}

let defaultGateway: SubmissionGateway | undefined;

export function getSubmissionGateway(): SubmissionGateway {
  defaultGateway ??= createSubmissionGateway(getSupabaseClient());
  return defaultGateway;
}

export const submissionGateway: SubmissionGateway = {
  submitAssignmentWork: (input) =>
    getSubmissionGateway().submitAssignmentWork(input),
  requestSubmissionRevision: (input) =>
    getSubmissionGateway().requestSubmissionRevision(input),
  approveAssignmentCompletion: (input) =>
    getSubmissionGateway().approveAssignmentCompletion(input),
  listAssignmentSubmissions: (assignmentId) =>
    getSubmissionGateway().listAssignmentSubmissions(assignmentId),
  getLatestAssignmentSubmission: (assignmentId) =>
    getSubmissionGateway().getLatestAssignmentSubmission(assignmentId),
};
