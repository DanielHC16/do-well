import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/shared/api/supabase";
import type { Database } from "@/types/database.generated";

import {
  type GigDraftFormInput,
  type GigRecord,
  GigRecordSchema,
} from "../model/gig-schemas";

type GigRow = Database["public"]["Tables"]["gigs"]["Row"];

function mapRowToGig(row: GigRow): GigRecord {
  return GigRecordSchema.parse({
    id: row.id,
    employerId: row.employer_id,
    title: row.title,
    description: row.description,
    category: row.category,
    workMode: row.work_mode,
    publicArea: row.public_area,
    publicLatitude: row.public_latitude,
    publicLongitude: row.public_longitude,
    budgetAmount: Number(row.budget_amount),
    currency: row.currency,
    status: row.status,
    applicationDeadline: row.application_deadline,
    dueAt: row.due_at,
    publishedAt: row.published_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export type GigGateway = Readonly<{
  createDraft: (
    input: GigDraftFormInput,
    employerId: string,
  ) => Promise<GigRecord>;
  updateDraft: (
    gigId: string,
    input: GigDraftFormInput,
    employerId: string,
  ) => Promise<GigRecord>;
  publishGig: (gigId: string) => Promise<GigRecord>;
  closeGig: (gigId: string) => Promise<GigRecord>;
  listEmployerGigs: (employerId: string) => Promise<GigRecord[]>;
  getGigById: (gigId: string) => Promise<GigRecord | null>;
}>;

export function createGigGateway(client: SupabaseClient<Database>): GigGateway {
  return {
    async createDraft(
      input: GigDraftFormInput,
      employerId: string,
    ): Promise<GigRecord> {
      const { data, error } = await client
        .from("gigs")
        .insert({
          employer_id: employerId,
          title: input.title,
          description: input.description,
          category: input.category,
          work_mode: input.workMode,
          public_area: input.workMode === "remote" ? null : input.publicArea,
          public_latitude:
            input.workMode === "remote"
              ? null
              : (input.publicLatitude ?? 14.5995),
          public_longitude:
            input.workMode === "remote"
              ? null
              : (input.publicLongitude ?? 120.9842),
          budget_amount: input.budgetAmount,
          currency: "PHP",
          application_deadline: input.applicationDeadline ?? null,
          due_at: input.dueAt ?? null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return mapRowToGig(data);
    },

    async updateDraft(
      gigId: string,
      input: GigDraftFormInput,
      employerId: string,
    ): Promise<GigRecord> {
      const { data, error } = await client
        .from("gigs")
        .update({
          title: input.title,
          description: input.description,
          category: input.category,
          work_mode: input.workMode,
          public_area: input.workMode === "remote" ? null : input.publicArea,
          public_latitude:
            input.workMode === "remote"
              ? null
              : (input.publicLatitude ?? 14.5995),
          public_longitude:
            input.workMode === "remote"
              ? null
              : (input.publicLongitude ?? 120.9842),
          budget_amount: input.budgetAmount,
          application_deadline: input.applicationDeadline ?? null,
          due_at: input.dueAt ?? null,
        })
        .eq("id", gigId)
        .eq("employer_id", employerId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return mapRowToGig(data);
    },

    async publishGig(gigId: string): Promise<GigRecord> {
      const { data, error } = await client.rpc("publish_gig", {
        p_gig_id: gigId,
      });

      if (error) {
        throw new Error(error.message);
      }

      const rows = data as unknown as GigRow[];
      const first = Array.isArray(rows) ? rows[0] : (rows as unknown as GigRow);
      if (!first) {
        throw new Error("Gig not found or unable to publish.");
      }

      return mapRowToGig(first);
    },

    async closeGig(gigId: string): Promise<GigRecord> {
      const { data, error } = await client.rpc("close_gig", {
        p_gig_id: gigId,
      });

      if (error) {
        throw new Error(error.message);
      }

      const rows = data as unknown as GigRow[];
      const first = Array.isArray(rows) ? rows[0] : (rows as unknown as GigRow);
      if (!first) {
        throw new Error("Gig not found or unable to close.");
      }

      return mapRowToGig(first);
    },

    async listEmployerGigs(employerId: string): Promise<GigRecord[]> {
      const { data, error } = await client
        .from("gigs")
        .select()
        .eq("employer_id", employerId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map(mapRowToGig);
    },

    async getGigById(gigId: string): Promise<GigRecord | null> {
      const { data, error } = await client
        .from("gigs")
        .select()
        .eq("id", gigId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data ? mapRowToGig(data) : null;
    },
  };
}

let defaultGateway: GigGateway | undefined;

export function getGigGateway(): GigGateway {
  defaultGateway ??= createGigGateway(getSupabaseClient());
  return defaultGateway;
}

export const gigGateway: GigGateway = {
  createDraft: (input, employerId) =>
    getGigGateway().createDraft(input, employerId),
  updateDraft: (gigId, input, employerId) =>
    getGigGateway().updateDraft(gigId, input, employerId),
  publishGig: (gigId) => getGigGateway().publishGig(gigId),
  closeGig: (gigId) => getGigGateway().closeGig(gigId),
  listEmployerGigs: (employerId) =>
    getGigGateway().listEmployerGigs(employerId),
  getGigById: (gigId) => getGigGateway().getGigById(gigId),
};
