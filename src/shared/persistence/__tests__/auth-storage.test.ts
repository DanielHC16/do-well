import {
  createAuthStorage,
  createPendingAuthAttemptStore,
} from "../auth-storage";

function createMemoryStorage() {
  const values = new Map<string, string>();

  return {
    values,
    storage: {
      getItem: async (key: string) => values.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: async (key: string) => {
        values.delete(key);
      },
    },
  };
}

describe("auth storage", () => {
  it("persists Supabase session material but removes provider tokens", async () => {
    const memory = createMemoryStorage();
    const storage = createAuthStorage(memory.storage);

    await storage.setItem(
      "supabase.auth.token",
      JSON.stringify({
        access_token: "supabase-access",
        refresh_token: "supabase-refresh",
        provider_token: "google-access",
        provider_refresh_token: "google-refresh",
        user: { id: "user-a", provider_token: "nested-google-token" },
      }),
    );

    const persisted = memory.values.get("supabase.auth.token") ?? "";
    expect(persisted).toContain("supabase-access");
    expect(persisted).toContain("supabase-refresh");
    expect(persisted).not.toContain("google-access");
    expect(persisted).not.toContain("google-refresh");
    expect(persisted).not.toContain("nested-google-token");
  });

  it("delegates reads and removal", async () => {
    const memory = createMemoryStorage();
    const storage = createAuthStorage(memory.storage);
    memory.values.set("key", "value");

    expect(await storage.getItem("key")).toBe("value");
    await storage.removeItem("key");
    expect(await storage.getItem("key")).toBeNull();
  });
});

describe("pending auth attempt storage", () => {
  it("permits one attempt for less than five minutes", async () => {
    let now = 1_000;
    const store = createPendingAuthAttemptStore(createMemoryStorage().storage, {
      now: () => now,
    });

    await expect(
      store.start({ kind: "google", flowId: "flow-a" }),
    ).resolves.toBe(true);
    await expect(store.start({ kind: "emailConfirmation" })).resolves.toBe(
      false,
    );

    now += 5 * 60 * 1_000;
    await expect(store.start({ kind: "emailConfirmation" })).resolves.toBe(
      true,
    );
  });

  it("reports expiry and consumes an attempt only once", async () => {
    let now = 1_000;
    const store = createPendingAuthAttemptStore(createMemoryStorage().storage, {
      now: () => now,
    });
    await store.start({ kind: "google", flowId: "flow-a" });
    now += 5 * 60 * 1_000;

    await expect(store.consume()).resolves.toEqual({ status: "expired" });
    await expect(store.consume()).resolves.toEqual({ status: "missing" });
  });

  it("serializes concurrent consumption", async () => {
    const store = createPendingAuthAttemptStore(createMemoryStorage().storage, {
      now: () => 1_000,
    });
    await store.start({ kind: "google", flowId: "flow-a" });

    const results = await Promise.all([store.consume(), store.consume()]);
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "valid" }),
        { status: "missing" },
      ]),
    );
  });
});
