import type { SupportedStorage } from "@supabase/auth-js";
import { z } from "zod";

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

const PENDING_AUTH_ATTEMPT_KEY = "do-well.pending-auth-attempt.v1";
const ATTEMPT_TTL_MS = 5 * 60 * 1_000;

const pendingAttemptSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("google"),
    flowId: z.string().min(1),
    createdAt: z.number().int().nonnegative(),
  }),
  z.object({
    kind: z.literal("emailConfirmation"),
    flowId: z.undefined().optional(),
    createdAt: z.number().int().nonnegative(),
  }),
  z.object({
    kind: z.literal("passwordRecovery"),
    flowId: z.undefined().optional(),
    createdAt: z.number().int().nonnegative(),
  }),
]);

export type PendingAuthAttempt = z.infer<typeof pendingAttemptSchema>;
export type NewPendingAuthAttempt =
  | Readonly<{ kind: "google"; flowId: string }>
  | Readonly<{ kind: "emailConfirmation"; flowId?: undefined }>
  | Readonly<{ kind: "passwordRecovery"; flowId?: undefined }>;

export type PendingAuthAttemptConsumption =
  | Readonly<{ status: "valid"; attempt: PendingAuthAttempt }>
  | Readonly<{ status: "missing" | "expired" | "invalid" }>;

export type PendingAuthAttemptStore = Readonly<{
  start: (attempt: NewPendingAuthAttempt) => Promise<boolean>;
  consume: () => Promise<PendingAuthAttemptConsumption>;
  clear: () => Promise<void>;
}>;

type AttemptStoreOptions = Readonly<{ now?: () => number }>;

export function createPendingAuthAttemptStore(
  storage: StorageLike,
  options: AttemptStoreOptions = {},
): PendingAuthAttemptStore {
  const now = options.now ?? Date.now;
  let queue: Promise<void> = Promise.resolve();

  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation, operation);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async function read() {
    const value = await storage.getItem(PENDING_AUTH_ATTEMPT_KEY);
    if (value === null) return { status: "missing" as const };

    try {
      const parsed = pendingAttemptSchema.safeParse(JSON.parse(value));
      if (!parsed.success) return { status: "invalid" as const };
      const age = now() - parsed.data.createdAt;
      if (age < 0 || age >= ATTEMPT_TTL_MS) {
        return { status: "expired" as const };
      }
      return { status: "valid" as const, attempt: parsed.data };
    } catch {
      return { status: "invalid" as const };
    }
  }

  return {
    start: (attempt) =>
      serialize(async () => {
        const existing = await read();
        if (existing.status === "valid") return false;
        await storage.setItem(
          PENDING_AUTH_ATTEMPT_KEY,
          JSON.stringify({ ...attempt, createdAt: now() }),
        );
        return true;
      }),
    consume: () =>
      serialize(async () => {
        const result = await read();
        if (result.status !== "missing") {
          await storage.removeItem(PENDING_AUTH_ATTEMPT_KEY);
        }
        return result;
      }),
    clear: () =>
      serialize(async () => {
        await storage.removeItem(PENDING_AUTH_ATTEMPT_KEY);
      }),
  };
}
