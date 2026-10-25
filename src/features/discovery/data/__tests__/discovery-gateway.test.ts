import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.generated";

import { createDiscoveryGateway } from "../discovery-gateway";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

function createFakeSupabase() {
  const fakeRow = {
    id: "81000000-0000-4000-8000-000000000001",
    employer_id: "80000000-0000-4000-8000-000000000001",
    title: "Makati House Deep Cleaning",
    description:
      "Deep clean master bedroom, kitchen counters, and mop living room tile floor.",
    category: "cleaning" as const,
    work_mode: "onsite" as const,
    public_area: "Poblacion, Makati",
    public_latitude: 14.5547,
    public_longitude: 121.0244,
    budget_amount: 1200,
    currency: "PHP",
    status: "published" as const,
    distance_km: 2.8,
    published_at: "2026-10-25T01:00:00.000Z",
    created_at: "2026-10-25T00:00:00.000Z",
    reasons: ["Within 5 km of you", "Recently posted"],
  };

  const client = {
    rpc: jest.fn(async (fnName: string, params: Record<string, unknown>) => {
      if (fnName === "discover_gigs") {
        if (params.p_category === "digital") {
          return { data: [], error: null };
        }
        return { data: [fakeRow], error: null };
      }
      return { data: null, error: new Error("Unknown RPC") };
    }),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(async () => ({ data: fakeRow, error: null })),
          })),
        })),
      })),
    })),
  } as unknown as SupabaseClient<Database>;

  return { client, fakeRow };
}

describe("discovery gateway", () => {
  it("calls discover_gigs RPC with mapped filter parameters", async () => {
    const { client } = createFakeSupabase();
    const gateway = createDiscoveryGateway(client);

    const gigs = await gateway.discoverGigs({
      filters: {
        category: "cleaning",
        workMode: "onsite",
        maxDistanceKm: 10,
        searchQuery: "Deep Cleaning",
      },
      workerLatitude: 14.55,
      workerLongitude: 121.02,
      limit: 15,
      offset: 0,
    });

    expect(client.rpc).toHaveBeenCalledWith("discover_gigs", {
      p_worker_lat: 14.55,
      p_worker_lng: 121.02,
      p_max_distance_km: 10,
      p_category: "cleaning",
      p_work_mode: "onsite",
      p_search_query: "Deep Cleaning",
      p_limit: 15,
      p_offset: 0,
    });

    expect(gigs).toHaveLength(1);
    expect(gigs[0].title).toBe("Makati House Deep Cleaning");
    expect(gigs[0].distanceKm).toBe(2.8);
    expect(gigs[0].reasons).toContain("Within 5 km of you");
  });

  it("normalizes 'all' category and workMode filters to undefined in RPC", async () => {
    const { client } = createFakeSupabase();
    const gateway = createDiscoveryGateway(client);

    await gateway.discoverGigs({
      filters: {
        category: "all",
        workMode: "all",
        searchQuery: "",
      },
    });

    expect(client.rpc).toHaveBeenCalledWith(
      "discover_gigs",
      expect.objectContaining({
        p_category: undefined,
        p_work_mode: undefined,
        p_search_query: undefined,
      }),
    );
  });

  it("fetches single public published gig by ID", async () => {
    const { client } = createFakeSupabase();
    const gateway = createDiscoveryGateway(client);

    const gig = await gateway.getPublicGig(
      "81000000-0000-4000-8000-000000000001",
    );
    expect(gig).not.toBeNull();
    expect(gig?.id).toBe("81000000-0000-4000-8000-000000000001");
    expect(gig?.title).toBe("Makati House Deep Cleaning");
  });

  it("writes to cache on successful discoverGigs call", async () => {
    const { client } = createFakeSupabase();
    const mockCache = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn(),
      purgeUser: jest.fn(),
      clearAll: jest.fn(),
    };
    const gateway = createDiscoveryGateway(client, mockCache as any);

    const result = await gateway.discoverGigsWithMetadata({}, "worker-1");

    expect(result.isFromCache).toBe(false);
    expect(result.gigs.length).toBe(1);
    expect(mockCache.set).toHaveBeenCalledWith(
      "worker-1",
      expect.stringContaining("discovery:feed"),
      result.gigs,
    );
  });

  it("falls back to cached feed when network fails", async () => {
    const failingClient = {
      rpc: jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Network request failed" },
      }),
    } as unknown as SupabaseClient<Database>;

    const mockCachedGigs = [
      {
        id: "81000000-0000-4000-8000-000000000001",
        employerId: "80000000-0000-4000-8000-000000000001",
        title: "Cached Gig",
        description: "Cached description",
        category: "errands",
        workMode: "onsite",
        publicArea: "Makati",
        publicLatitude: null,
        publicLongitude: null,
        budgetAmount: 1000,
        currency: "PHP",
        status: "published",
        distanceKm: null,
        publishedAt: "2026-10-25T00:00:00.000Z",
        createdAt: "2026-10-25T00:00:00.000Z",
        reasons: [],
      },
    ];

    const mockCache = {
      get: jest.fn().mockResolvedValue({
        data: mockCachedGigs,
        cachedAt: "2026-10-25T12:00:00.000Z",
        userId: "worker-1",
        version: 1,
        key: "discovery:feed:{}",
        byteSize: 100,
      }),
      set: jest.fn(),
      remove: jest.fn(),
      purgeUser: jest.fn(),
      clearAll: jest.fn(),
    };

    const gateway = createDiscoveryGateway(failingClient, mockCache as any);

    const result = await gateway.discoverGigsWithMetadata({}, "worker-1");

    expect(result.isFromCache).toBe(true);
    expect(result.cachedAt).toBe("2026-10-25T12:00:00.000Z");
    expect(result.gigs[0].title).toBe("Cached Gig");

    // Also verify transparent discoverGigs() returns the cached list
    const fallbackList = await gateway.discoverGigs();
    expect(fallbackList[0].title).toBe("Cached Gig");
  });
});
