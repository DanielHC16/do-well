import type { SupportedStorage } from "@supabase/auth-js";

type StorageLike = Pick<SupportedStorage, "getItem" | "setItem" | "removeItem">;

function removeProviderTokens(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeProviderTokens);
  if (typeof value !== "object" || value === null) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) => key !== "provider_token" && key !== "provider_refresh_token",
      )
      .map(([key, child]) => [key, removeProviderTokens(child)]),
  );
}

function sanitizeStoredValue(value: string): string {
  try {
    return JSON.stringify(removeProviderTokens(JSON.parse(value)));
  } catch {
    return value;
  }
}

export function createAuthStorage(storage: StorageLike): SupportedStorage {
  return {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, sanitizeStoredValue(value)),
    removeItem: (key) => storage.removeItem(key),
  };
}
