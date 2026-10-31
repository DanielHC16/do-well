import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.generated";
import type { CacheStore } from "@/shared/persistence/cache-store";

import { createDiscoveryGateway } from "../discovery-gateway";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

function createFakeSupabase(status: "published" | "closed" = "published") {
  const fakeRow = {
    id: "81000000-0000-4000-8000-000000000001",
    employer_id: "80000000-0000-4000-8000-000000000001",
    employer: { display_name: "Maya Santos" },
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
    status,
    distance_km: 2.8,
    due_at: "2026-11-02T09:00:00.000Z",
    application_deadline: "2026-11-01T09:00:00.000Z",
    published_at: "2026-10-25T01:00:00.000Z",
    created_at: "2026-10-25T00:00:00.000Z",
    reasons: ["Within 5 km of you", "Recently posted"],
  };

  const readResult = jest
    .fn()
    .mockResolvedValue({ data: fakeRow, error: null });
  const query = { eq: jest.fn(() => ({ maybeSingle: readResult })) };
  const select = jest.fn(() => query);
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
      select,
    })),
  } as unknown as SupabaseClient<Database>;

  return { client, fakeRow, query, readResult, select };
}

describe("discovery gateway", () => {
  it("reads only the employer display name through the verified gig relationship", async () => {
    const { client, select } = createFakeSupabase();
    const gig = await createDiscoveryGateway(client).getPublicGig(
      "81000000-0000-4000-8000-000000000001",
    );
    expect(select).toHaveBeenCalledWith(
      "*, employer:profiles!gigs_employer_id_fkey(display_name)",
    );
    expect(gig?.employerDisplayName).toBe("Maya Santos");
  });

  it("keeps the gig readable when the optional employer relation is absent", async () => {
    const { client, fakeRow, readResult } = createFakeSupabase();
    readResult.mockResolvedValue({
      data: { ...fakeRow, employer: null },
      error: null,
    });
    const gig = await createDiscoveryGateway(client).getPublicGig(fakeRow.id);
    expect(gig?.title).toBe(fakeRow.title);
    expect(gig?.employerDisplayName).toBeNull();
  });
  it.each(["permission", "other account", "wrong gig", "invalid payload"])(
    "rejects a cached detail after %s boundary failure",
    async (failure) => {
      const { client, readResult } = createFakeSupabase("closed");
      const cache: CacheStore = {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
        purgeUser: jest.fn(),
        clearAll: jest.fn(),
      };
      const gateway = createDiscoveryGateway(client, cache);
      const gigId = "81000000-0000-4000-8000-000000000001";
      const gig = await gateway.getPublicGig(gigId);
      jest.mocked(cache.get).mockResolvedValue({
        data:
          failure === "wrong gig"
            ? { ...gig, id: "81000000-0000-4000-8000-000000000002" }
            : failure === "invalid payload"
              ? { id: gigId }
              : gig,
        userId: failure === "other account" ? "worker-2" : "worker-1",
        key: `gig:detail:${gigId}`,
        version: 1,
        cachedAt: "2026-10-31T00:00:00.000Z",
        byteSize: 100,
      });
      const error =
        failure === "permission"
          ? { code: "42501", message: "permission denied" }
          : { code: "", message: "Network request failed" };
      readResult.mockResolvedValue({ data: null, error });
      await expect(gateway.getPublicGig(gigId, "worker-1")).rejects.toEqual(
        error,
      );
      if (failure === "permission") expect(cache.get).not.toHaveBeenCalled();
    },
  );

  it("uses a validated same-user detail snapshot for network failure", async () => {
    const { client, readResult } = createFakeSupabase("closed");
    const cache: CacheStore = {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      purgeUser: jest.fn(),
      clearAll: jest.fn(),
    };
    const gateway = createDiscoveryGateway(client, cache);
    const gigId = "81000000-0000-4000-8000-000000000001";
    const gig = await gateway.getPublicGig(gigId);
    jest.mocked(cache.get).mockResolvedValue({
      data: gig,
      userId: "worker-1",
      key: `gig:detail:${gigId}`,
      version: 1,
      cachedAt: "2026-10-31T00:00:00.000Z",
      byteSize: 100,
    });
    readResult.mockResolvedValue({
      data: null,
      error: { code: "", message: "Network request failed" },
    });
    await expect(gateway.getPublicGig(gigId, "worker-1")).resolves.toEqual(gig);
    expect(cache.get).toHaveBeenCalledWith("worker-1", `gig:detail:${gigId}`);
  });
  it("never persists related gig details in a shared anonymous cache", async () => {
    const { client } = createFakeSupabase("closed");
    const cache: CacheStore = {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      purgeUser: jest.fn(),
      clearAll: jest.fn(),
    };
    const gateway = createDiscoveryGateway(client, cache);
    await gateway.getPublicGig("81000000-0000-4000-8000-000000000001");
    expect(cache.set).not.toHaveBeenCalled();
    await gateway.getPublicGig(
      "81000000-0000-4000-8000-000000000001",
      "worker-1",
    );
    expect(cache.set).toHaveBeenCalledWith(
      "worker-1",
      expect.stringContaining("gig:detail:"),
      expect.objectContaining({ status: "closed" }),
    );
  });
  it("allows RLS-authorized related closed gigs without applying a published-only filter", async () => {
    const { client, query } = createFakeSupabase("closed");
    const gig = await createDiscoveryGateway(client).getPublicGig(
      "81000000-0000-4000-8000-000000000001",
    );
    expect(gig?.status).toBe("closed");
    expect(query.eq).toHaveBeenCalledTimes(1);
    expect(query.eq).toHaveBeenCalledWith(
      "id",
      "81000000-0000-4000-8000-000000000001",
    );
  });
  it("partitions saved feeds by location and pagination to avoid showing unrelated nearby results offline", async () => {
    const { client } = createFakeSupabase();
    const cache: CacheStore = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn(),
      purgeUser: jest.fn(),
      clearAll: jest.fn(),
    };
    const gateway = createDiscoveryGateway(client, cache);
    await gateway.discoverGigsWithMetadata(
      { workerLatitude: 14.55, workerLongitude: 121.02 },
      "worker-1",
    );
    await gateway.discoverGigsWithMetadata(
      { workerLatitude: 14.6, workerLongitude: 121.03 },
      "worker-1",
    );
    await gateway.discoverGigsWithMetadata(
      { workerLatitude: 14.55, workerLongitude: 121.02, offset: 20 },
      "worker-1",
    );
    await gateway.discoverGigsWithMetadata(
      { workerLatitude: 14.55, workerLongitude: 121.02, limit: 10 },
      "worker-1",
    );
    const savedKeys = jest.mocked(cache.set).mock.calls.map((call) => call[1]);
    expect(new Set(savedKeys).size).toBe(4);
  });
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
    expect(gig?.dueAt).toBe("2026-11-02T09:00:00.000Z");
    expect(gig?.applicationDeadline).toBe("2026-11-01T09:00:00.000Z");
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
