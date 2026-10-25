import { z } from "zod";

export const APPLICATION_STATUSES = [
  "pending",
  "withdrawn",
  "accepted",
  "rejected",
  "declined",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const ApplicationRecordSchema = z.object({
  id: z.string().uuid(),
  gigId: z.string().uuid(),
  workerId: z.string().uuid(),
  message: z.string().max(1000).nullable().default(null),
  status: z.enum(APPLICATION_STATUSES),
  clientRequestId: z.string().uuid(),
  decidedAt: z.string().datetime({ offset: true }).nullable().default(null),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type ApplicationRecord = z.infer<typeof ApplicationRecordSchema>;

export const ApplicantSummarySchema = z.object({
  id: z.string().uuid(),
  gigId: z.string().uuid(),
  workerId: z.string().uuid(),
  message: z.string().max(1000).nullable().default(null),
  status: z.enum(APPLICATION_STATUSES),
  decidedAt: z.string().datetime({ offset: true }).nullable().default(null),
  createdAt: z.string().datetime({ offset: true }),
  workerDisplayName: z.string().trim().min(1),
  workerHomeArea: z.string().trim().nullable().default(null),
});

export type ApplicantSummary = z.infer<typeof ApplicantSummarySchema>;

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

export const AssignmentRecordSchema = z.object({
  id: z.string().uuid(),
  gigId: z.string().uuid(),
  applicationId: z.string().uuid(),
  employerId: z.string().uuid(),
  workerId: z.string().uuid(),
  agreementVersion: z.number().int().positive(),
  agreedTitle: z.string().trim().min(5).max(100),
  agreedDescription: z.string().trim().min(20).max(4000),
  agreedAmount: z.number().positive().max(1000000),
  currency: z.literal("PHP"),
  dueAt: z.string().datetime({ offset: true }).nullable().default(null),
  status: z.enum(ASSIGNMENT_STATUSES),
  employerConfirmedAt: z.string().datetime({ offset: true }),
  workerConfirmedAt: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .default(null),
  startedAt: z.string().datetime({ offset: true }).nullable().default(null),
  completedAt: z.string().datetime({ offset: true }).nullable().default(null),
  cancelledAt: z.string().datetime({ offset: true }).nullable().default(null),
  clientRequestId: z.string().uuid(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type AssignmentRecord = z.infer<typeof AssignmentRecordSchema>;

export const ApplyToGigFormSchema = z.object({
  message: z
    .string()
    .max(1000, "Message cannot exceed 1000 characters.")
    .transform((val) => val.trim())
    .optional()
    .default(""),
});

export type ApplyToGigFormValues = z.infer<typeof ApplyToGigFormSchema>;
