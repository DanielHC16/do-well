import { z } from "zod";

export const reportCategorySchema = z.enum([
  "scam",
  "unsafe",
  "harassment",
  "prohibited",
  "other",
]);

export type ReportCategory = z.infer<typeof reportCategorySchema>;

export const reportStatusSchema = z.enum([
  "open",
  "reviewing",
  "resolved",
  "dismissed",
]);

export type ReportStatus = z.infer<typeof reportStatusSchema>;

export const createReportInputSchema = z
  .object({
    category: reportCategorySchema,
    details: z
      .string()
      .trim()
      .min(20, "Please provide at least 20 characters explaining the issue.")
      .max(2000, "Details cannot exceed 2000 characters."),
    subjectProfileId: z.string().uuid().optional(),
    gigId: z.string().uuid().optional(),
    assignmentId: z.string().uuid().optional(),
    clientRequestId: z.string().uuid().optional(),
  })
  .refine(
    (data) => Boolean(data.subjectProfileId || data.gigId || data.assignmentId),
    {
      message: "A report must identify a profile, gig, or assignment.",
      path: ["details"],
    },
  );

export type CreateReportInput = z.infer<typeof createReportInputSchema>;

export const reportRowSchema = z
  .object({
    id: z.string().uuid(),
    reporter_id: z.string().uuid(),
    category: reportCategorySchema,
    details: z.string(),
    status: reportStatusSchema,
    subject_profile_id: z.string().uuid().nullable(),
    gig_id: z.string().uuid().nullable(),
    assignment_id: z.string().uuid().nullable(),
    client_request_id: z.string().uuid(),
    created_at: z.string(),
    updated_at: z.string(),
    reviewed_by: z.string().uuid().nullable(),
    reviewed_at: z.string().nullable(),
  })
  .transform((row) => ({
    id: row.id,
    reporterId: row.reporter_id,
    category: row.category,
    details: row.details,
    status: row.status,
    subjectProfileId: row.subject_profile_id,
    gigId: row.gig_id,
    assignmentId: row.assignment_id,
    clientRequestId: row.client_request_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
  }));

export type Report = z.infer<typeof reportRowSchema>;
