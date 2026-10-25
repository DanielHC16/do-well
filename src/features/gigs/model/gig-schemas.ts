import { z } from "zod";

export const GIG_CATEGORIES = [
  "errands",
  "delivery",
  "cleaning",
  "events",
  "admin",
  "tutoring",
  "digital",
  "other",
] as const;

export type GigCategory = (typeof GIG_CATEGORIES)[number];

export const GIG_CATEGORY_LABELS: Readonly<Record<GigCategory, string>> = {
  errands: "Errands & Tasks",
  delivery: "Local Delivery",
  cleaning: "Cleaning & Yard",
  events: "Event Help",
  admin: "Office & Admin",
  tutoring: "Tutoring & Lessons",
  digital: "Digital & Design",
  other: "Other Work",
};

export const GIG_WORK_MODES = ["onsite", "remote", "hybrid"] as const;
export type GigWorkMode = (typeof GIG_WORK_MODES)[number];

export const GIG_STATUSES = [
  "draft",
  "published",
  "assigned",
  "in_progress",
  "submitted",
  "revision_requested",
  "completed",
  "closed",
  "cancelled",
] as const;
export type GigStatus = (typeof GIG_STATUSES)[number];

export const GigCategorySchema = z.enum(GIG_CATEGORIES);
export const GigWorkModeSchema = z.enum(GIG_WORK_MODES);
export const GigStatusSchema = z.enum(GIG_STATUSES);

export const GigDraftFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(5, "Title must be at least 5 characters.")
      .max(100, "Title must be at most 100 characters."),
    description: z
      .string()
      .trim()
      .min(20, "Description must be at least 20 characters.")
      .max(4000, "Description must be at most 4,000 characters."),
    category: GigCategorySchema,
    workMode: GigWorkModeSchema,
    publicArea: z.string().trim().max(120).nullable(),
    publicLatitude: z.number().min(-90).max(90).nullable().optional(),
    publicLongitude: z.number().min(-180).max(180).nullable().optional(),
    budgetAmount: z
      .number()
      .finite()
      .positive("Budget must be greater than zero.")
      .max(1_000_000, "Budget cannot exceed PHP 1,000,000."),
    currency: z.literal("PHP").default("PHP"),
    applicationDeadline: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .optional(),
    dueAt: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.workMode !== "remote") {
      if (!data.publicArea || data.publicArea.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Neighborhood area is required for onsite or hybrid work.",
          path: ["publicArea"],
        });
      }
    } else if (data.publicArea !== null && data.publicArea.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Remote gigs must not specify an area.",
        path: ["publicArea"],
      });
    }
  });

export type GigDraftFormInput = z.infer<typeof GigDraftFormSchema>;

export const GigRecordSchema = z.object({
  id: z.string().uuid(),
  employerId: z.string().uuid(),
  title: z.string().trim().min(5).max(100),
  description: z.string().trim().min(20).max(4000),
  category: GigCategorySchema,
  workMode: GigWorkModeSchema,
  publicArea: z.string().trim().nullable(),
  publicLatitude: z.number().nullable(),
  publicLongitude: z.number().nullable(),
  budgetAmount: z.number().positive().max(1_000_000),
  currency: z.string(),
  status: GigStatusSchema,
  applicationDeadline: z.string().datetime({ offset: true }).nullable(),
  dueAt: z.string().datetime({ offset: true }).nullable(),
  publishedAt: z.string().datetime({ offset: true }).nullable(),
  closedAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type GigRecord = z.infer<typeof GigRecordSchema>;
