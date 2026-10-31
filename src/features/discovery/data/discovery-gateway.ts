import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/shared/api/supabase";
import { cacheStore, type CacheStore } from "@/shared/persistence/cache-store";
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

export type DiscoverGigsResult = Readonly<{
  gigs: DiscoveryGigCard[];
  isFromCache: boolean;
  cachedAt?: string | null;
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
  discoverGigsWithMetadata: (
    params?: DiscoverGigsParams,
    userId?: string,
  ) => Promise<DiscoverGigsResult>;
  getPublicGig: (
    gigId: string,
    userId?: string,
  ) => Promise<DiscoveryGigCard | null>;
}>;

function isNetworkFailure(failure: unknown): boolean {
  if (
    typeof failure !== "object" ||
    failure === null ||
    !("message" in failure) ||
    typeof failure.message !== "string"
  )
    return false;
  if (
    "code" in failure &&
    typeof failure.code === "string" &&
    failure.code.length > 0
  )
    return false;
  return (
    /network request failed|failed to fetch|fetch failed|networkerror|network error|timed? ?out|timeout/i.test(
      failure.message,
    ) ||
    ("name" in failure &&
      (failure.name === "AbortError" || failure.name === "TimeoutError"))
  );
}

export function createDiscoveryGateway(
  client: SupabaseClient<Database>,
  cache: CacheStore = cacheStore,
): DiscoveryGateway {
  return {
    async discoverGigsWithMetadata(
      params: DiscoverGigsParams = {},
      userId?: string,
    ): Promise<DiscoverGigsResult> {
      const safeUser = userId || "anonymous";
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
      // A saved page is valid only for the same effective query and location.
      const cacheKey = `discovery:feed:${JSON.stringify({
        category,
        workMode,
        searchQuery,
        maxDistanceKm: filters.maxDistanceKm ?? null,
        workerLatitude,
        workerLongitude,
        limit,
        offset,
      })}`;

      try {
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

        const mapped = (data ?? []).map(mapRowToCard);
        try {
          await cache.set(safeUser, cacheKey, mapped);
        } catch {
          // Best effort cache write
        }

        return { gigs: mapped, isFromCache: false, cachedAt: null };
      } catch (err) {
        try {
          const cached = await cache.get<DiscoveryGigCard[]>(
            safeUser,
            cacheKey,
          );
          if (cached?.data) {
            return {
              gigs: cached.data,
              isFromCache: true,
              cachedAt: cached.cachedAt,
            };
          }
        } catch {
          // Best effort cache read
        }
        throw err;
      }
    },

    async discoverGigs(
      params: DiscoverGigsParams = {},
    ): Promise<DiscoveryGigCard[]> {
      const result = await this.discoverGigsWithMetadata(params);
      return result.gigs;
    },

    async getPublicGig(
      gigId: string,
      userId?: string,
    ): Promise<DiscoveryGigCard | null> {
      const cacheKey = `gig:detail:${gigId}`;

      try {
        const { data, error } = await client
          .from("gigs")
          .select("*, employer:profiles!gigs_employer_id_fkey(display_name)")
          .eq("id", gigId)
          .maybeSingle();

        if (error) throw error;

        if (!data) return null;

        const employerName =
          DiscoveryGigCardSchema.shape.employerDisplayName.safeParse(
            data.employer?.display_name,
          );

        const mapped = DiscoveryGigCardSchema.parse({
          id: data.id,
          employerId: data.employer_id,
          employerDisplayName: employerName.success
            ? (employerName.data ?? null)
            : null,
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
          dueAt: data.due_at,
          applicationDeadline: data.application_deadline,
          reasons:
            data.work_mode === "remote" ? ["Remote - work from anywhere"] : [],
        });

        try {
          if (userId) await cache.set(userId, cacheKey, mapped);
        } catch {
          // Best effort cache write
        }

        return mapped;
      } catch (err) {
        try {
          if (!userId || !isNetworkFailure(err)) throw err;
          const cached = await cache.get<DiscoveryGigCard>(userId, cacheKey);
          const parsed = DiscoveryGigCardSchema.safeParse(cached?.data);
          if (
            cached?.userId === userId &&
            parsed.success &&
            parsed.data.id === gigId
          )
            return parsed.data;
        } catch {
          // Best effort cache read
        }
        throw err;
      }
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
  discoverGigsWithMetadata: (params, userId) =>
    getDiscoveryGateway().discoverGigsWithMetadata(params, userId),
  getPublicGig: (gigId, userId) =>
    getDiscoveryGateway().getPublicGig(gigId, userId),
};
