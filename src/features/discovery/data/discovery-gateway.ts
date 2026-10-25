import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/shared/api/supabase";
import type { Database } from "@/types/database.generated";

import {
  type DiscoveryFilters,
  type DiscoveryGigCard,
  DiscoveryGigCardSchema,
} from "../model/discovery-schemas";

export type DiscoverGigsParams = Readonly<{
  filters?: Partial<DiscoveryFilters>;
  workerLatitude?: number | null;
  workerLongitude?: number | null;
  limit?: number;
  offset?: number;
}>;

type DiscoveryRow =
  Database["public"]["Functions"]["discover_gigs"]["Returns"][number];

function mapRowToCard(row: DiscoveryRow): DiscoveryGigCard {
  return DiscoveryGigCardSchema.parse({
    id: row.id,
    employerId: row.employer_id,
    title: row.title,
    description: row.description,
    category: row.category,
    workMode: row.work_mode,
    publicArea: row.public_area,
    publicLatitude: row.public_latitude ? Number(row.public_latitude) : null,
    publicLongitude: row.public_longitude ? Number(row.public_longitude) : null,
    budgetAmount: Number(row.budget_amount),
    currency: row.currency,
    status: row.status,
    distanceKm: row.distance_km ? Number(row.distance_km) : null,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    reasons: row.reasons ?? [],
  });
}

export type DiscoveryGateway = Readonly<{
  discoverGigs: (params?: DiscoverGigsParams) => Promise<DiscoveryGigCard[]>;
  getPublicGig: (gigId: string) => Promise<DiscoveryGigCard | null>;
}>;

export function createDiscoveryGateway(
  client: SupabaseClient<Database>,
): DiscoveryGateway {
  return {
    async discoverGigs(
      params: DiscoverGigsParams = {},
    ): Promise<DiscoveryGigCard[]> {
      const {
        filters = {},
        workerLatitude = null,
        workerLongitude = null,
        limit = 20,
        offset = 0,
      } = params;

      const category =
        filters.category && filters.category !== "all"
          ? filters.category
          : undefined;
      const workMode =
        filters.workMode && filters.workMode !== "all"
          ? filters.workMode
          : undefined;
      const searchQuery =
        filters.searchQuery && filters.searchQuery.trim().length > 0
          ? filters.searchQuery.trim()
          : undefined;

      const { data, error } = await client.rpc("discover_gigs", {
        p_worker_lat: workerLatitude ?? undefined,
        p_worker_lng: workerLongitude ?? undefined,
        p_max_distance_km: filters.maxDistanceKm ?? undefined,
        p_category: category,
        p_work_mode: workMode,
        p_search_query: searchQuery,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map(mapRowToCard);
    },

    async getPublicGig(gigId: string): Promise<DiscoveryGigCard | null> {
      const { data, error } = await client
        .from("gigs")
        .select()
        .eq("id", gigId)
        .eq("status", "published")
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) return null;

      return DiscoveryGigCardSchema.parse({
        id: data.id,
        employerId: data.employer_id,
        title: data.title,
        description: data.description,
        category: data.category,
        workMode: data.work_mode,
        publicArea: data.public_area,
        publicLatitude: data.public_latitude
          ? Number(data.public_latitude)
          : null,
        publicLongitude: data.public_longitude
          ? Number(data.public_longitude)
          : null,
        budgetAmount: Number(data.budget_amount),
        currency: data.currency,
        status: data.status,
        distanceKm: null,
        publishedAt: data.published_at,
        createdAt: data.created_at,
        reasons:
          data.work_mode === "remote" ? ["Remote - work from anywhere"] : [],
      });
    },
  };
}

let defaultGateway: DiscoveryGateway | undefined;

export function getDiscoveryGateway(): DiscoveryGateway {
  defaultGateway ??= createDiscoveryGateway(getSupabaseClient());
  return defaultGateway;
}

export const discoveryGateway: DiscoveryGateway = {
  discoverGigs: (params) => getDiscoveryGateway().discoverGigs(params),
  getPublicGig: (gigId) => getDiscoveryGateway().getPublicGig(gigId),
};
