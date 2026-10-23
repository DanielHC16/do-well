import { createAuthStorage } from "../auth-storage";

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
