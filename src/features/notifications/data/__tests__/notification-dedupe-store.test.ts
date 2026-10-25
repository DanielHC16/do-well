import { createNotificationDedupeStore } from "../notification-dedupe-store";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
}));

describe("notification-dedupe-store", () => {
  it("distinguishes an uninitialized account from an initialized empty baseline", async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: jest.fn(async (key: string) => values.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        values.set(key, value);
      }),
    };
    const store = createNotificationDedupeStore(storage);

    await expect(store.isInitialized("user-a")).resolves.toBe(false);
    await store.initialize("user-a", []);
    await expect(store.isInitialized("user-a")).resolves.toBe(true);
    await expect(store.list("user-a")).resolves.toEqual([]);
  });

  it("records existing events as the first opt-in baseline", async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: jest.fn(async (key: string) => values.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        values.set(key, value);
      }),
    };
    const store = createNotificationDedupeStore(storage);
    const eventIds = [
      "95000000-0000-4000-8000-000000000001",
      "95000000-0000-4000-8000-000000000002",
    ];

    await store.initialize("user-a", eventIds);

    await expect(store.list("user-a")).resolves.toEqual(eventIds);
  });

  it("partitions event ids by account and removes duplicates", async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: jest.fn(async (key: string) => values.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        values.set(key, value);
      }),
    };
    const store = createNotificationDedupeStore(storage);
    const eventId = "95000000-0000-4000-8000-000000000001";

    await store.mark("user-a", eventId);
    await store.mark("user-a", eventId);

    await expect(store.list("user-a")).resolves.toEqual([eventId]);
    await expect(store.list("user-b")).resolves.toEqual([]);
  });

  it("fails closed when persisted data is malformed", async () => {
    const store = createNotificationDedupeStore({
      getItem: jest.fn(async () => "not-json"),
      setItem: jest.fn(async () => undefined),
    });

    await expect(store.list("user-a")).resolves.toEqual([]);
    await expect(store.isInitialized("user-a")).resolves.toBe(false);
  });
});
