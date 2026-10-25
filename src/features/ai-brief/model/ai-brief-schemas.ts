import { z } from "zod";

import {
  GIG_CATEGORIES,
  GIG_WORK_MODES,
} from "@/features/gigs/model/gig-schemas";

export const AI_SCHEMA_VERSION = "1" as const;

export const AI_PROMPT_VERSION = "job-brief-v1" as const;

export const AI_ERROR_CODES = [
  "VALIDATION_FAILED",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "RATE_LIMITED",
  "AI_TIMEOUT",
  "AI_CAPACITY",
  "AI_INVALID_OUTPUT",
  "AI_UNAVAILABLE",
] as const;

export type AiErrorCode = (typeof AI_ERROR_CODES)[number];

export const JobBriefFactsSchema = z
  .object({
    taskSummary: z
      .string()
      .trim()
      .min(10, "Task summary must be at least 10 characters.")
      .max(1200, "Task summary cannot exceed 1200 characters."),
    category: z.enum(GIG_CATEGORIES),
    workMode: z.enum(GIG_WORK_MODES),
    publicArea: z
      .string()
      .trim()
      .max(120, "Public area cannot exceed 120 characters.")
      .optional()
      .nullable(),
    budgetPhp: z
      .number()
      .finite()
      .min(0.01, "Budget must be at least 0.01 PHP.")
      .max(1000000, "Budget cannot exceed 1,000,000 PHP.")
      .optional()
      .nullable(),
    dueAt: z.string().datetime().optional().nullable(),
    tasks: z
      .array(z.string().trim().min(1).max(200))
      .max(10, "Maximum 10 tasks permitted.")
      .default([]),
    skills: z
      .array(z.string().trim().min(1).max(80))
      .max(10, "Maximum 10 skills permitted.")
      .default([]),
    constraints: z
      .array(z.string().trim().min(1).max(200))
      .max(8, "Maximum 8 constraints permitted.")
      .default([]),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.workMode !== "remote") {
      if (!val.publicArea || val.publicArea.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Public area is required for onsite or hybrid gigs.",
          path: ["publicArea"],
        });
      }
    }
  });

export type JobBriefFactsInput = z.input<typeof JobBriefFactsSchema>;
export type JobBriefFacts = z.output<typeof JobBriefFactsSchema>;

export const JobBriefRequestSchema = z
  .object({
    requestId: z.string().uuid("Invalid request ID UUID."),
    locale: z.literal("en-PH").default("en-PH"),
    facts: JobBriefFactsSchema,
  })
  .strict();

export type JobBriefRequest = z.infer<typeof JobBriefRequestSchema>;

export const JobBriefTaskItemSchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(5, "Task description must be at least 5 characters.")
      .max(200, "Task description cannot exceed 200 characters."),
    acceptanceCriterion: z
      .string()
      .trim()
      .min(5, "Acceptance criterion must be at least 5 characters.")
      .max(240, "Acceptance criterion cannot exceed 240 characters."),
  })
  .strict();

export type JobBriefTaskItem = z.infer<typeof JobBriefTaskItemSchema>;

export const JobBriefDraftSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(5, "Title must be at least 5 characters.")
      .max(100, "Title cannot exceed 100 characters."),
    description: z
      .string()
      .trim()
      .min(20, "Description must be at least 20 characters.")
      .max(2000, "Description cannot exceed 2000 characters."),
    category: z.enum(GIG_CATEGORIES),
    workMode: z.enum(GIG_WORK_MODES),
    tasks: z
      .array(JobBriefTaskItemSchema)
      .min(1, "Draft must include at least one task.")
      .max(10, "Draft cannot include more than 10 tasks."),
    skills: z
      .array(z.string().trim().min(1).max(80))
      .max(10, "Draft cannot exceed 10 skills.")
      .default([]),
    assumptions: z
      .array(z.string().trim().min(1).max(200))
      .max(5, "Draft cannot exceed 5 assumptions.")
      .default([]),
    safetyNotes: z
      .array(z.string().trim().min(1).max(200))
      .max(5, "Draft cannot exceed 5 safety notes.")
      .default([]),
  })
  .strict();

export type JobBriefDraft = z.infer<typeof JobBriefDraftSchema>;

export const JobBriefMetaSchema = z
  .object({
    provider: z.string().trim().min(1),
    model: z.string().trim().min(1),
    promptVersion: z.string().trim().min(1),
    isFallback: z.boolean(),
  })
  .strict();

export type JobBriefMeta = z.infer<typeof JobBriefMetaSchema>;

export const JobBriefResponseSchema = z
  .object({
    schemaVersion: z.literal(AI_SCHEMA_VERSION),
    requestId: z.string().uuid(),
    draft: JobBriefDraftSchema,
    meta: JobBriefMetaSchema,
  })
  .strict();

export type JobBriefResponse = z.infer<typeof JobBriefResponseSchema>;

export const AiErrorPayloadSchema = z
  .object({
    error: z.object({
      code: z.enum(AI_ERROR_CODES),
      message: z.string().min(1),
      details: z.array(z.string()).default([]),
    }),
  })
  .strict();

export type AiErrorPayload = z.infer<typeof AiErrorPayloadSchema>;
