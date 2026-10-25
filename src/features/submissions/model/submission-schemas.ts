import { z } from "zod";

export const EVIDENCE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type EvidenceMimeType = (typeof EVIDENCE_MIME_TYPES)[number];

export const EVIDENCE_MAX_FILE_SIZE = 5242880; // 5 MB

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

export const SubmissionFileRecordSchema = z.object({
  id: z.string().uuid(),
  submissionId: z.string().uuid(),
  uploaderId: z.string().uuid(),
  objectPath: z.string().min(1).max(500),
  mediaType: z.enum(EVIDENCE_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(EVIDENCE_MAX_FILE_SIZE),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SubmissionFileRecord = z.infer<typeof SubmissionFileRecordSchema>;

export const SelectedEvidenceImageSchema = z.object({
  uri: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive().max(EVIDENCE_MAX_FILE_SIZE),
  mimeType: z.enum(EVIDENCE_MIME_TYPES),
  width: z.number().positive().nullable().optional(),
  height: z.number().positive().nullable().optional(),
});

export type SelectedEvidenceImage = z.infer<typeof SelectedEvidenceImageSchema>;

export const FinalizeSubmissionFileInputSchema = z.object({
  object_path: z.string().min(1),
  media_type: z.enum(EVIDENCE_MIME_TYPES),
  size_bytes: z.number().int().positive().max(EVIDENCE_MAX_FILE_SIZE),
});

export type FinalizeSubmissionFileInput = z.infer<
  typeof FinalizeSubmissionFileInputSchema
>;

export const BeginSubmissionInputSchema = z.object({
  assignmentId: z.string().uuid("Assignment ID must be a valid UUID."),
  milestoneId: z
    .string()
    .uuid("Milestone ID must be a valid UUID.")
    .nullable()
    .optional(),
  note: z
    .string()
    .trim()
    .max(2000, "Submission note cannot exceed 2000 characters.")
    .nullable()
    .optional(),
  clientRequestId: z.string().uuid().optional(),
});

export type BeginSubmissionInput = z.infer<typeof BeginSubmissionInputSchema>;

export const FinalizeSubmissionInputSchema = z.object({
  submissionId: z.string().uuid("Submission ID must be a valid UUID."),
  files: z.array(FinalizeSubmissionFileInputSchema).default([]),
});

export type FinalizeSubmissionInput = z.infer<
  typeof FinalizeSubmissionInputSchema
>;

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
