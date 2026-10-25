import { z } from "zod";

export const ASSIGNMENT_STATUSES = [
  "proposed",
  "active",
  "submitted",
  "revision_requested",
  "completed",
  "declined",
  "cancelled",
] as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const AssignmentStatusSchema = z.enum(ASSIGNMENT_STATUSES);

export const MILESTONE_STATUSES = [
  "pending",
  "in_progress",
  "submitted",
  "revision_requested",
  "approved",
  "cancelled",
] as const;

export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const MilestoneStatusSchema = z.enum(MILESTONE_STATUSES);

export const AssignmentRecordSchema = z.object({
  id: z.string().uuid(),
  gigId: z.string().uuid(),
  applicationId: z.string().uuid(),
  employerId: z.string().uuid(),
  workerId: z.string().uuid(),
  agreementVersion: z.number().int().positive(),
  agreedTitle: z.string().min(5).max(100),
  agreedDescription: z.string().min(20).max(4000),
  agreedAmount: z.number().positive().max(1000000),
  currency: z.literal("PHP"),
  dueAt: z.string().nullable(),
  status: AssignmentStatusSchema,
  employerConfirmedAt: z.string(),
  workerConfirmedAt: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  clientRequestId: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AssignmentRecord = z.infer<typeof AssignmentRecordSchema>;

export const MilestoneRecordSchema = z.object({
  id: z.string().uuid(),
  assignmentId: z.string().uuid(),
  position: z.number().int().min(1).max(20),
  title: z.string().min(2).max(100),
  description: z.string().max(1000).nullable(),
  dueAt: z.string().nullable(),
  status: MilestoneStatusSchema,
  approvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type MilestoneRecord = z.infer<typeof MilestoneRecordSchema>;

export const ParticipantSummarySchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  homeArea: z.string().nullable(),
});

export type ParticipantSummary = z.infer<typeof ParticipantSummarySchema>;

export const GigSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  category: z.string(),
  workMode: z.string(),
  publicArea: z.string().nullable(),
});

export type GigSummary = z.infer<typeof GigSummarySchema>;

export const AssignmentDetailSchema = z.object({
  assignment: AssignmentRecordSchema,
  employer: ParticipantSummarySchema,
  worker: ParticipantSummarySchema,
  gig: GigSummarySchema,
});

export type AssignmentDetail = z.infer<typeof AssignmentDetailSchema>;

export const CreateMilestoneInputSchema = z.object({
  assignmentId: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(2, "Milestone title must be at least 2 characters.")
    .max(100, "Milestone title must not exceed 100 characters."),
  description: z
    .string()
    .trim()
    .max(1000, "Milestone description must not exceed 1000 characters.")
    .optional()
    .nullable(),
  dueAt: z.string().optional().nullable(),
});

export type CreateMilestoneInput = z.infer<typeof CreateMilestoneInputSchema>;

export const ActivityEventRecordSchema = z.object({
  id: z.string().uuid(),
  eventType: z.string(),
  payload: z.record(z.string(), z.unknown()),
  dedupeKey: z.string(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
  gigId: z.string().uuid().nullable(),
  assignmentId: z.string().uuid().nullable(),
});

export type ActivityEventRecord = z.infer<typeof ActivityEventRecordSchema>;
