import { z } from "zod";

import { ApplicationRecordSchema } from "@/features/applications/model/application-schemas";
import { AssignmentStatusSchema } from "@/features/assignments/model/assignment-schemas";
import { GigStatusSchema } from "@/features/gigs/model/gig-schemas";
import type { ShellMode } from "@/features/shell/model/shell-mode";
import { getSupabaseClient } from "@/shared/api/supabase";
import { toLoadError } from "@/shared/api/load-error";
import { withTimeout } from "@/shared/api/network-timeout";

export type WorkSection = "applications" | "listings" | "active" | "completed";
export const WORK_PAGE_SIZE = 20;
export type WorkItem = Readonly<{
  id: string;
  gigId: string;
  title: string;
  status: string;
  amount: number | null;
  dueAt: string | null;
  kind: "application" | "assignment" | "listing";
}>;
type Result = Promise<Readonly<{ data: unknown; error: unknown }>>;
export type WorkPort = Readonly<{
  listApplications: (userId: string, offset: number) => Result;
  listListings: (userId: string, offset: number) => Result;
  listAssignments: (
    userId: string,
    mode: ShellMode,
    completed: boolean,
    offset: number,
  ) => Result;
}>;
const gigSummary = z.object({
  title: z.string(),
  budget_amount: z.number().positive(),
  due_at: z.string().nullable(),
});
const applicationRow = z.object({
  id: z.string().uuid(),
  gig_id: z.string().uuid(),
  status: ApplicationRecordSchema.shape.status,
  gigs: gigSummary.nullable(),
});
const assignmentRow = z.object({
  id: z.string().uuid(),
  gig_id: z.string().uuid(),
  agreed_title: z.string(),
  agreed_amount: z.number().positive(),
  due_at: z.string().nullable(),
  status: AssignmentStatusSchema,
});
const listingRow = gigSummary.extend({
  id: z.string().uuid(),
  status: GigStatusSchema,
});

export function createWorkGateway(port: WorkPort) {
  return {
    async list(
      userId: string,
      mode: ShellMode,
      section: WorkSection,
      offset = 0,
    ): Promise<WorkItem[]> {
      z.string().uuid().parse(userId);
      z.number().int().nonnegative().parse(offset);
      try {
        if (section === "applications") {
          if (mode !== "worker") throw new Error("Invalid workspace");
          const result = await withTimeout(
            port.listApplications(userId, offset),
          );
          if (result.error) throw result.error;
          return z
            .array(applicationRow)
            .parse(result.data)
            .map((row) => ({
              id: row.id,
              gigId: row.gig_id,
              title: row.gigs?.title ?? "Gig no longer available",
              status: row.status,
              amount: row.gigs?.budget_amount ?? null,
              dueAt: row.gigs?.due_at ?? null,
              kind: "application",
            }));
        }
        if (section === "listings") {
          if (mode !== "employer") throw new Error("Invalid workspace");
          const result = await withTimeout(port.listListings(userId, offset));
          if (result.error) throw result.error;
          return z
            .array(listingRow)
            .parse(result.data)
            .map((row) => ({
              id: row.id,
              gigId: row.id,
              title: row.title,
              status: row.status,
              amount: row.budget_amount,
              dueAt: row.due_at,
              kind: "listing",
            }));
        }
        const result = await withTimeout(
          port.listAssignments(userId, mode, section === "completed", offset),
        );
        if (result.error) throw result.error;
        return z
          .array(assignmentRow)
          .parse(result.data)
          .map((row) => ({
            id: row.id,
            gigId: row.gig_id,
            title: row.agreed_title,
            status: row.status,
            amount: row.agreed_amount,
            dueAt: row.due_at,
            kind: "assignment",
          }));
      } catch (cause) {
        // Same user-facing copy; the kind lets screens tell offline from denied.
        throw toLoadError(cause, "We couldn't load your work. Try again.");
      }
    },
  };
}
export type WorkGateway = ReturnType<typeof createWorkGateway>;

// Reads use the existing authenticated client and participant/owner RLS policies.
export const workGateway: WorkGateway = {
  list: (userId, mode, section, offset) => {
    const client = getSupabaseClient();
    return createWorkGateway({
      listApplications: async (id, start) =>
        await client
          .from("applications")
          .select("id,gig_id,status,gigs(title,budget_amount,due_at)")
          .eq("worker_id", id)
          .order("created_at", { ascending: false })
          .order("id")
          .range(start, start + WORK_PAGE_SIZE - 1),
      listListings: async (id, start) =>
        await client
          .from("gigs")
          .select("id,title,status,budget_amount,due_at")
          .eq("employer_id", id)
          .order("created_at", { ascending: false })
          .order("id")
          .range(start, start + WORK_PAGE_SIZE - 1),
      listAssignments: async (id, workspace, completed, start) => {
        const query = client
          .from("assignments")
          .select("id,gig_id,agreed_title,agreed_amount,due_at,status")
          .eq(workspace === "employer" ? "employer_id" : "worker_id", id);
        return await (
          completed
            ? query.eq("status", "completed")
            : query.in("status", [
                "proposed",
                "active",
                "submitted",
                "revision_requested",
              ])
        )
          .order("created_at", { ascending: false })
          .order("id")
          .range(start, start + WORK_PAGE_SIZE - 1);
      },
    }).list(userId, mode, section, offset);
  },
};
