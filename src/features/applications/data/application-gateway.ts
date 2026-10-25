import type { SupabaseClient } from "@supabase/supabase-js";
import * as Crypto from "expo-crypto";

import { getSupabaseClient } from "@/shared/api/supabase";
import type { Database } from "@/types/database.generated";

import {
  type ApplicantSummary,
  ApplicantSummarySchema,
  type ApplicationRecord,
  ApplicationRecordSchema,
  type AssignmentRecord,
  AssignmentRecordSchema,
} from "../model/application-schemas";

export type ApplyToGigParams = Readonly<{
  gigId: string;
  message?: string | null;
  clientRequestId?: string;
}>;

export type SelectWorkerParams = Readonly<{
  applicationId: string;
  clientRequestId?: string;
}>;

type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"];
type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"];
type ApplicantRow =
  Database["public"]["Functions"]["list_gig_applicants"]["Returns"][number];

function mapApplicationRow(row: ApplicationRow): ApplicationRecord {
  return ApplicationRecordSchema.parse({
    id: row.id,
    gigId: row.gig_id,
    workerId: row.worker_id,
    message: row.message,
    status: row.status,
    clientRequestId: row.client_request_id,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapApplicantRow(row: ApplicantRow): ApplicantSummary {
  return ApplicantSummarySchema.parse({
    id: row.id,
    gigId: row.gig_id,
    workerId: row.worker_id,
    message: row.message,
    status: row.status,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
    workerDisplayName: row.worker_display_name,
    workerHomeArea: row.worker_home_area,
  });
}

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

export type ApplicationGateway = Readonly<{
  applyToGig: (params: ApplyToGigParams) => Promise<ApplicationRecord>;
  withdrawApplication: (applicationId: string) => Promise<ApplicationRecord>;
  selectWorkerAtomic: (params: SelectWorkerParams) => Promise<AssignmentRecord>;
  listGigApplicants: (gigId: string) => Promise<ApplicantSummary[]>;
  getWorkerApplicationForGig: (
    gigId: string,
  ) => Promise<ApplicationRecord | null>;
  getAssignmentForGig: (gigId: string) => Promise<AssignmentRecord | null>;
}>;

export function createApplicationGateway(
  client: SupabaseClient<Database>,
): ApplicationGateway {
  return {
    async applyToGig(params: ApplyToGigParams): Promise<ApplicationRecord> {
      const {
        gigId,
        message = null,
        clientRequestId = Crypto.randomUUID(),
      } = params;

      const { data, error } = await client.rpc("apply_to_gig", {
        p_gig_id: gigId,
        p_message:
          message && message.trim().length > 0 ? message.trim() : undefined,
        p_client_request_id: clientRequestId,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Failed to apply to gig.");
      }

      return mapApplicationRow(data as unknown as ApplicationRow);
    },

    async withdrawApplication(
      applicationId: string,
    ): Promise<ApplicationRecord> {
      const { data, error } = await client.rpc("withdraw_application", {
        p_application_id: applicationId,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Failed to withdraw application.");
      }

      return mapApplicationRow(data as unknown as ApplicationRow);
    },

    async selectWorkerAtomic(
      params: SelectWorkerParams,
    ): Promise<AssignmentRecord> {
      const { applicationId, clientRequestId = Crypto.randomUUID() } = params;

      const { data, error } = await client.rpc("select_worker_atomic", {
        p_application_id: applicationId,
        p_client_request_id: clientRequestId,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Failed to select worker.");
      }

      return mapAssignmentRow(data as unknown as AssignmentRow);
    },

    async listGigApplicants(gigId: string): Promise<ApplicantSummary[]> {
      const { data, error } = await client.rpc("list_gig_applicants", {
        p_gig_id: gigId,
      });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map(mapApplicantRow);
    },

    async getWorkerApplicationForGig(
      gigId: string,
    ): Promise<ApplicationRecord | null> {
      const { data, error } = await client.rpc(
        "get_worker_application_for_gig",
        {
          p_gig_id: gigId,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      if (!data || !("id" in data) || !data.id) {
        return null;
      }

      return mapApplicationRow(data as unknown as ApplicationRow);
    },

    async getAssignmentForGig(gigId: string): Promise<AssignmentRecord | null> {
      const { data, error } = await client
        .from("assignments")
        .select()
        .eq("gig_id", gigId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) return null;

      return mapAssignmentRow(data);
    },
  };
}

let defaultGateway: ApplicationGateway | undefined;

export function getApplicationGateway(): ApplicationGateway {
  defaultGateway ??= createApplicationGateway(getSupabaseClient());
  return defaultGateway;
}

export const applicationGateway: ApplicationGateway = {
  applyToGig: (params) => getApplicationGateway().applyToGig(params),
  withdrawApplication: (applicationId) =>
    getApplicationGateway().withdrawApplication(applicationId),
  selectWorkerAtomic: (params) =>
    getApplicationGateway().selectWorkerAtomic(params),
  listGigApplicants: (gigId) =>
    getApplicationGateway().listGigApplicants(gigId),
  getWorkerApplicationForGig: (gigId) =>
    getApplicationGateway().getWorkerApplicationForGig(gigId),
  getAssignmentForGig: (gigId) =>
    getApplicationGateway().getAssignmentForGig(gigId),
};
