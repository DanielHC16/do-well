import {
  createCacheStore,
  MAX_CACHE_ENTRIES_PER_USER,
  MAX_CACHE_PAYLOAD_BYTES,
} from "../cache-store";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

describe("cacheStore", () => {
  let memoryStore: Record<string, string> = {};

  const mockStorage = {
    getItem: jest.fn(async (key: string) => memoryStore[key] ?? null),
    setItem: jest.fn(async (key: string, val: string) => {
      memoryStore[key] = val;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete memoryStore[key];
    }),
    getAllKeys: jest.fn(async () => Object.keys(memoryStore)),
    multiRemove: jest.fn(async (keys: string[]) => {
      for (const k of keys) delete memoryStore[k];
    }),
  };

  beforeEach(() => {
    memoryStore = {};
    jest.clearAllMocks();
  });

  it("stores and retrieves cached data with envelope metadata", async () => {
    const store = createCacheStore(mockStorage as any);
    const testData = { gigs: [{ id: "g1", title: "Assembly" }] };

    const envelope = await store.set("user-1", "discovery:feed", testData, 1);

    expect(envelope.key).toBe("discovery:feed");
    expect(envelope.userId).toBe("user-1");
    expect(envelope.data).toEqual(testData);
    expect(envelope.cachedAt).toBeDefined();

    const retrieved = await store.get<typeof testData>(
      "user-1",
      "discovery:feed",
    );
    expect(retrieved).not.toBeNull();
    expect(retrieved?.data).toEqual(testData);
  });

  it("rejects payloads exceeding the 500 KB safety cap", async () => {
    const store = createCacheStore(mockStorage as any);
    const hugePayload = "x".repeat(MAX_CACHE_PAYLOAD_BYTES + 10);

    await expect(store.set("user-1", "huge:data", hugePayload)).rejects.toThrow(
      "Payload exceeds maximum allowable cache size",
    );
  });

  it("enforces user isolation and prevents cross-account cache leakage", async () => {
    const store = createCacheStore(mockStorage as any);

    await store.set("user-A", "profile", { name: "Alice" });
    await store.set("user-B", "profile", { name: "Bob" });

    const aliceFromA = await store.get("user-A", "profile");
    const bobFromB = await store.get("user-B", "profile");

    expect(aliceFromA?.data).toEqual({ name: "Alice" });
    expect(bobFromB?.data).toEqual({ name: "Bob" });

    // Requesting user-B's key with user-A's identity returns null
    const leaked = await store.get("user-A", "non-existent");
    expect(leaked).toBeNull();
  });

  it("evicts oldest items when exceeding max entries cap", async () => {
    const store = createCacheStore(mockStorage as any);

    for (let i = 0; i < MAX_CACHE_ENTRIES_PER_USER + 5; i++) {
      await store.set("user-1", `item-${i}`, { index: i });
    }

    // Earliest items should be evicted
    const item0 = await store.get("user-1", "item-0");
    const item4 = await store.get("user-1", "item-4");
    expect(item0).toBeNull();
    expect(item4).toBeNull();

    // Latest items should be retained
    const latest = await store.get(
      "user-1",
      `item-${MAX_CACHE_ENTRIES_PER_USER + 4}`,
    );
    expect(latest).not.toBeNull();
  });

  it("purges all cached data for a user on sign-out", async () => {
    const store = createCacheStore(mockStorage as any);

    await store.set("user-1", "feed", { test: 1 });
    await store.set("user-1", "assignments", { test: 2 });
    await store.set("user-2", "feed", { user2: true });

    await store.purgeUser("user-1");

    expect(await store.get("user-1", "feed")).toBeNull();
    expect(await store.get("user-1", "assignments")).toBeNull();

    // User-2's cache is untouched
    expect(await store.get("user-2", "feed")).not.toBeNull();
  });

  it("removes a specific key cleanly", async () => {
    const store = createCacheStore(mockStorage as any);

    await store.set("user-1", "target", { toDelete: true });
    await store.remove("user-1", "target");

    expect(await store.get("user-1", "target")).toBeNull();
  });
});
