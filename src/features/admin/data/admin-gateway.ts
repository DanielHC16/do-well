import { z } from "zod";

import { getSupabaseClient } from "@/shared/api/supabase";

import type { AdminConsoleGateway } from "../screens/AdminConsoleScreen";

const adminReportSchema = z
  .object({
    id: z.string().uuid(),
    reporter_id: z.string().uuid(),
    subject_profile_id: z.string().uuid().nullable(),
    gig_id: z.string().uuid().nullable(),
    assignment_id: z.string().uuid().nullable(),
    category: z.string(),
    details: z.string(),
    status: z.enum(["open", "resolved", "dismissed"]),
    resolution_note: z.string().nullable(),
    reviewed_by: z.string().uuid().nullable(),
    reviewed_at: z.string().nullable(),
    created_at: z.string(),
  })
  .transform((row) => ({
    id: row.id,
    reporterId: row.reporter_id,
    subjectProfileId: row.subject_profile_id,
    gigId: row.gig_id,
    assignmentId: row.assignment_id,
    category: row.category,
    details: row.details,
    status: row.status,
    resolutionNote: row.resolution_note,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  }));

const overviewSchema = z
  .object({
    profiles: z.number().int().nonnegative(),
    open_reports: z.number().int().nonnegative(),
    published_gigs: z.number().int().nonnegative(),
    active_assignments: z.number().int().nonnegative(),
  })
  .transform((row) => ({
    profiles: row.profiles,
    openReports: row.open_reports,
    publishedGigs: row.published_gigs,
    activeAssignments: row.active_assignments,
  }));

export const adminGateway: AdminConsoleGateway = {
  async getAdminOverview() {
    const { data, error } = await getSupabaseClient().rpc("get_admin_overview");
    if (error) throw new Error("Admin data could not be loaded.");
    return overviewSchema.parse(data);
  },
  async listAdminReports() {
    const { data, error } = await getSupabaseClient().rpc(
      "list_admin_reports",
      { p_status: "open", p_limit: 20, p_offset: 0 },
    );
    if (error) throw new Error("Admin reports could not be loaded.");
    return z.array(adminReportSchema).parse(data);
  },
  async resolveReport(reportId, decision, resolutionNote) {
    const input = z
      .object({
        reportId: z.string().uuid(),
        decision: z.enum(["resolved", "dismissed"]),
        resolutionNote: z.string().trim().min(10).max(2000),
      })
      .parse({ reportId, decision, resolutionNote });
    const { data, error } = await getSupabaseClient().rpc("resolve_report", {
      p_report_id: input.reportId,
      p_decision: input.decision,
      p_resolution_note: input.resolutionNote,
    });
    if (error) throw new Error("The moderation decision could not be saved.");
    return adminReportSchema.parse(data);
  },
};
