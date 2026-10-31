import { z } from "zod";

import type { ShellMode } from "@/features/shell/model/shell-mode";
import { toLoadError } from "@/shared/api/load-error";
import type { CacheStore } from "@/shared/persistence/cache-store";

import type { WorkGateway, WorkItem, WorkSection } from "./work-gateway";

const LOAD_FAILED = "We couldn't load your work. Try again.";

// Snapshots are revalidated before rendering; a malformed entry is ignored.
const CachedWorkSchema = z.array(
  z.object({
    id: z.string().uuid(),
    gigId: z.string().uuid(),
    title: z.string(),
    status: z.string(),
    amount: z.number().nullable(),
    dueAt: z.string().nullable(),
    kind: z.enum(["application", "assignment", "listing"]),
  }),
);

export type WorkPage = Readonly<{
  items: WorkItem[];
  /** Set when the page came from the saved snapshot (offline). */
  cachedAt: string | null;
}>;

export type WorkReader = (
  userId: string,
  mode: ShellMode,
  section: WorkSection,
  offset: number,
) => Promise<WorkPage>;

/**
 * Wraps the work gateway with a user-scoped first-page snapshot. The snapshot
 * is served only for network/timeout failures, never for authorization errors.
 */
export function createCachedWorkReader(
  gateway: Pick<WorkGateway, "list">,
  cache: CacheStore,
): WorkReader {
  return async (userId, mode, section, offset) => {
    const key = `work:${mode}:${section}`;
    try {
      const items = await gateway.list(userId, mode, section, offset);
      if (offset === 0) void cache.set(userId, key, items).catch(() => null);
      return { items, cachedAt: null };
    } catch (cause) {
      const error = toLoadError(cause, LOAD_FAILED);
      if (
        offset !== 0 ||
        (error.kind !== "offline" && error.kind !== "timeout")
      )
        throw error;
      const snapshot = await cache.get<unknown>(userId, key).catch(() => null);
      const parsed = CachedWorkSchema.safeParse(snapshot?.data);
      if (!snapshot || !parsed.success) throw error;
      return { items: parsed.data, cachedAt: snapshot.cachedAt };
    }
  };
}

async function loadCache(): Promise<CacheStore> {
  return (await import("@/shared/persistence/cache-store")).cacheStore;
}

/**
 * The shared user-scoped cache, loaded on first use so rendering My Work does
 * not pull AsyncStorage into module scope. Storage failures degrade to "no
 * snapshot" rather than breaking the live read.
 */
export const lazyCacheStore: CacheStore = {
  get: async (userId, key) => (await loadCache()).get(userId, key),
  set: async (userId, key, data, version) =>
    (await loadCache()).set(userId, key, data, version),
  remove: async (userId, key) => (await loadCache()).remove(userId, key),
  purgeUser: async (userId) => (await loadCache()).purgeUser(userId),
  clearAll: async () => (await loadCache()).clearAll(),
};
