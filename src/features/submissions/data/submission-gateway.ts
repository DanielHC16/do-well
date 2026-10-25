import type { SupabaseClient } from "@supabase/supabase-js";
import * as Crypto from "expo-crypto";

import { getSupabaseClient } from "@/shared/api/supabase";
import type { Database } from "@/types/database.generated";

import {
  type ApproveSubmissionInput,
  ApproveSubmissionInputSchema,
  type BeginSubmissionInput,
  BeginSubmissionInputSchema,
  type FinalizeSubmissionInput,
  FinalizeSubmissionInputSchema,
  type RequestRevisionInput,
  RequestRevisionInputSchema,
  type SubmissionFileRecord,
  SubmissionFileRecordSchema,
  type SubmissionRecord,
  SubmissionRecordSchema,
  type SubmitWorkInput,
  SubmitWorkInputSchema,
} from "../model/submission-schemas";

type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];
type SubmissionFileRow =
  Database["public"]["Tables"]["submission_files"]["Row"];

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

function mapSubmissionFileRow(row: SubmissionFileRow): SubmissionFileRecord {
  return SubmissionFileRecordSchema.parse({
    id: row.id,
    submissionId: row.submission_id,
    uploaderId: row.uploader_id,
    objectPath: row.object_path,
    mediaType: row.media_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function splitEvidenceObjectPath(objectPath: string): Readonly<{
  directory: string;
  fileName: string;
}> {
  const separatorIndex = objectPath.lastIndexOf("/");
  if (separatorIndex <= 0 || separatorIndex === objectPath.length - 1) {
    throw new Error(
      "Evidence object path must include a directory and filename.",
    );
  }

  return {
    directory: objectPath.slice(0, separatorIndex),
    fileName: objectPath.slice(separatorIndex + 1),
  };
}

export type SubmissionGateway = Readonly<{
  submitAssignmentWork: (input: SubmitWorkInput) => Promise<SubmissionRecord>;
  beginSubmission: (input: BeginSubmissionInput) => Promise<SubmissionRecord>;
  finalizeSubmission: (
    input: FinalizeSubmissionInput,
  ) => Promise<SubmissionRecord>;
  listSubmissionFiles: (
    submissionId: string,
  ) => Promise<SubmissionFileRecord[]>;
  createEvidenceSignedUrl: (
    objectPath: string,
    expiresInSeconds?: number,
  ) => Promise<string>;
  uploadEvidenceBlob: (
    objectPath: string,
    fileBlob: Blob | ArrayBuffer,
    contentType: string,
  ) => Promise<string>;
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
      const clientRequestId = validated.clientRequestId ?? Crypto.randomUUID();

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

    async beginSubmission(input: BeginSubmissionInput) {
      const validated = BeginSubmissionInputSchema.parse(input);
      const clientRequestId = validated.clientRequestId ?? Crypto.randomUUID();

      const { data, error } = await client.rpc("begin_submission", {
        p_assignment_id: validated.assignmentId,
        p_note: validated.note ?? undefined,
        p_milestone_id: validated.milestoneId ?? undefined,
        p_client_request_id: clientRequestId,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Failed to begin submission: no record returned.");
      }

      return mapSubmissionRow(data as SubmissionRow);
    },

    async finalizeSubmission(input: FinalizeSubmissionInput) {
      const validated = FinalizeSubmissionInputSchema.parse(input);

      const { data, error } = await client.rpc("finalize_submission", {
        p_submission_id: validated.submissionId,
        p_files: validated.files,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Failed to finalize submission: no record returned.");
      }

      return mapSubmissionRow(data as SubmissionRow);
    },

    async listSubmissionFiles(submissionId: string) {
      const { data, error } = await client.rpc("list_submission_files", {
        p_submission_id: submissionId,
      });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map((row) =>
        mapSubmissionFileRow(row as SubmissionFileRow),
      );
    },

    async createEvidenceSignedUrl(
      objectPath: string,
      expiresInSeconds: number = 3600,
    ) {
      const { data, error } = await client.storage
        .from("submission-evidence")
        .createSignedUrl(objectPath, expiresInSeconds);

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.signedUrl) {
        throw new Error("Failed to create signed URL for evidence.");
      }

      return data.signedUrl;
    },

    async uploadEvidenceBlob(
      objectPath: string,
      fileBlob: Blob | ArrayBuffer,
      contentType: string,
    ) {
      const bucket = client.storage.from("submission-evidence");
      const { data, error } = await bucket.upload(objectPath, fileBlob, {
        contentType,
        upsert: false,
      });

      if (error) {
        // An immutable upload can reach Storage even when the client loses the
        // response. Reconcile only the exact reserved object before retrying.
        const { directory, fileName } = splitEvidenceObjectPath(objectPath);
        const { data: existingObjects, error: listError } = await bucket.list(
          directory,
          {
            limit: 1,
            search: fileName,
          },
        );

        if (
          !listError &&
          existingObjects?.some((object) => object.name === fileName)
        ) {
          return objectPath;
        }

        throw new Error(error.message);
      }

      if (!data?.path) {
        throw new Error("Failed to upload evidence object.");
      }

      return data.path;
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
  beginSubmission: (input) => getSubmissionGateway().beginSubmission(input),
  finalizeSubmission: (input) =>
    getSubmissionGateway().finalizeSubmission(input),
  listSubmissionFiles: (submissionId) =>
    getSubmissionGateway().listSubmissionFiles(submissionId),
  createEvidenceSignedUrl: (objectPath, expiresInSeconds) =>
    getSubmissionGateway().createEvidenceSignedUrl(
      objectPath,
      expiresInSeconds,
    ),
  uploadEvidenceBlob: (objectPath, fileBlob, contentType) =>
    getSubmissionGateway().uploadEvidenceBlob(
      objectPath,
      fileBlob,
      contentType,
    ),
  requestSubmissionRevision: (input) =>
    getSubmissionGateway().requestSubmissionRevision(input),
  approveAssignmentCompletion: (input) =>
    getSubmissionGateway().approveAssignmentCompletion(input),
  listAssignmentSubmissions: (assignmentId) =>
    getSubmissionGateway().listAssignmentSubmissions(assignmentId),
  getLatestAssignmentSubmission: (assignmentId) =>
    getSubmissionGateway().getLatestAssignmentSubmission(assignmentId),
};
