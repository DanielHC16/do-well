import { z } from "zod";

export const SubmissionStatusSchema = z.enum([
  "pending_upload",
  "submitted",
  "revision_requested",
  "approved",
  "abandoned",
]);

export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;

export const SubmissionRecordSchema = z.object({
  id: z.string().uuid(),
  assignmentId: z.string().uuid(),
  milestoneId: z.string().uuid().nullable(),
  submittedBy: z.string().uuid(),
  version: z.number().int().positive(),
  note: z.string().max(2000).nullable(),
  status: SubmissionStatusSchema,
  reviewNote: z.string().max(2000).nullable(),
  submittedAt: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  clientRequestId: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SubmissionRecord = z.infer<typeof SubmissionRecordSchema>;

export const SubmitWorkInputSchema = z.object({
  assignmentId: z.string().uuid("Assignment ID must be a valid UUID."),
  note: z
    .string()
    .trim()
    .max(2000, "Submission note cannot exceed 2000 characters.")
    .optional()
    .nullable(),
  milestoneId: z
    .string()
    .uuid("Milestone ID must be a valid UUID.")
    .optional()
    .nullable(),
  clientRequestId: z.string().uuid().optional(),
});

export type SubmitWorkInput = z.infer<typeof SubmitWorkInputSchema>;

export const RequestRevisionInputSchema = z.object({
  submissionId: z.string().uuid("Submission ID must be a valid UUID."),
  reviewNote: z
    .string()
    .trim()
    .min(1, "Please provide specific revision instructions.")
    .max(2000, "Revision note cannot exceed 2000 characters."),
});

export type RequestRevisionInput = z.infer<typeof RequestRevisionInputSchema>;

export const ApproveSubmissionInputSchema = z.object({
  submissionId: z.string().uuid("Submission ID must be a valid UUID."),
  reviewNote: z
    .string()
    .trim()
    .max(2000, "Review note cannot exceed 2000 characters.")
    .optional()
    .nullable(),
});

export type ApproveSubmissionInput = z.infer<
  typeof ApproveSubmissionInputSchema
>;
