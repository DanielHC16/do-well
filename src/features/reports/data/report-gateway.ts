import * as Crypto from "expo-crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "../../../shared/api/supabase";
import {
  createReportInputSchema,
  reportRowSchema,
  type CreateReportInput,
  type Report,
} from "../model/report-schemas";

export type ReportGateway = Readonly<{
  submitReport: (input: CreateReportInput) => Promise<Report>;
  listMyReports: () => Promise<readonly Report[]>;
}>;

export function createReportGateway(
  client: SupabaseClient = getSupabaseClient(),
): ReportGateway {
  return {
    async submitReport(input: CreateReportInput): Promise<Report> {
      const validated = createReportInputSchema.parse(input);
      const clientRequestId = validated.clientRequestId ?? Crypto.randomUUID();

      const { data, error } = await client.rpc("submit_report", {
        p_category: validated.category,
        p_details: validated.details,
        p_subject_profile_id: validated.subjectProfileId ?? null,
        p_gig_id: validated.gigId ?? null,
        p_assignment_id: validated.assignmentId ?? null,
        p_client_request_id: clientRequestId,
      });

      if (error) {
        throw new Error(error.message || "Failed to submit report.");
      }

      return reportRowSchema.parse(data);
    },

    async listMyReports(): Promise<readonly Report[]> {
      const { data, error } = await client
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message || "Failed to fetch reports.");
      }

      if (!Array.isArray(data)) {
        return [];
      }

      return data.map((row) => reportRowSchema.parse(row));
    },
  };
}

let defaultReportGateway: ReportGateway | null = null;

export function getReportGateway(): ReportGateway {
  if (!defaultReportGateway) {
    defaultReportGateway = createReportGateway();
  }
  return defaultReportGateway;
}
