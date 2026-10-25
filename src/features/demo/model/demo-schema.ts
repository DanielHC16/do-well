import { z } from "zod";

const idSchema = z.string().trim().min(1).max(120);
const timestampSchema = z.string().datetime({ offset: true });

export const DemoPersonaSchema = z
  .object({
    id: idSchema,
    role: z.enum(["employer", "worker"]),
    displayName: z.string().trim().min(2).max(80),
  })
  .strict();

export const DemoGigSchema = z
  .object({
    id: idSchema,
    employerId: idSchema,
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(10).max(1_000),
    category: z.string().trim().min(2).max(80),
    workMode: z.enum(["onsite", "remote"]),
    publicArea: z.string().trim().min(2).max(120).nullable(),
    budgetAmount: z.number().finite().positive().max(1_000_000),
    status: z.enum(["published", "assigned", "completed"]),
    createdAt: timestampSchema,
  })
  .strict()
  .superRefine((gig, context) => {
    if (gig.workMode === "onsite" && gig.publicArea === null) {
      context.addIssue({
        code: "custom",
        path: ["publicArea"],
        message: "Onsite gigs require a public area.",
      });
    }
    if (gig.workMode === "remote" && gig.publicArea !== null) {
      context.addIssue({
        code: "custom",
        path: ["publicArea"],
        message: "Remote gigs must not include a public area.",
      });
    }
  });

export const DemoApplicationSchema = z
  .object({
    id: idSchema,
    gigId: idSchema,
    workerId: idSchema,
    message: z.string().trim().min(10).max(500),
    status: z.enum(["pending", "accepted"]),
    createdAt: timestampSchema,
  })
  .strict();

export const DemoAssignmentSchema = z
  .object({
    id: idSchema,
    gigId: idSchema,
    employerId: idSchema,
    workerId: idSchema,
    status: z.enum(["active", "submitted", "completed"]),
    submissionNote: z.string().trim().min(3).max(1_000).nullable(),
    submittedAt: timestampSchema.nullable(),
    completedAt: timestampSchema.nullable(),
  })
  .strict()
  .superRefine((assignment, context) => {
    if (assignment.status === "active") {
      if (
        assignment.submissionNote !== null ||
        assignment.submittedAt !== null ||
        assignment.completedAt !== null
      ) {
        context.addIssue({
          code: "custom",
          message: "Active assignments cannot contain completion data.",
        });
      }
      return;
    }

    if (assignment.submissionNote === null || assignment.submittedAt === null) {
      context.addIssue({
        code: "custom",
        message: "Submitted assignments require submission details.",
      });
    }
    if (assignment.status === "submitted" && assignment.completedAt !== null) {
      context.addIssue({
        code: "custom",
        message: "Submitted assignments cannot be completed yet.",
      });
    }
    if (assignment.status === "completed" && assignment.completedAt === null) {
      context.addIssue({
        code: "custom",
        message: "Completed assignments require a completion time.",
      });
    }
  });

export const DemoActivitySchema = z
  .object({
    id: idSchema,
    gigId: idSchema,
    assignmentId: idSchema.nullable(),
    actor: z.enum(["employer", "worker"]),
    type: z.enum([
      "gig_published",
      "application_submitted",
      "worker_selected",
      "work_submitted",
      "work_approved",
    ]),
    summary: z.string().trim().min(3).max(240),
    occurredAt: timestampSchema,
  })
  .strict();

export const DemoStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    activePersona: z.enum(["employer", "worker"]),
    gigs: z.array(DemoGigSchema),
    applications: z.array(DemoApplicationSchema),
    assignments: z.array(DemoAssignmentSchema),
    activity: z.array(DemoActivitySchema),
  })
  .strict();

export type DemoPersona = z.infer<typeof DemoPersonaSchema>;
export type DemoGig = z.infer<typeof DemoGigSchema>;
export type DemoApplication = z.infer<typeof DemoApplicationSchema>;
export type DemoAssignment = z.infer<typeof DemoAssignmentSchema>;
export type DemoActivity = z.infer<typeof DemoActivitySchema>;
export type DemoState = z.infer<typeof DemoStateSchema>;
