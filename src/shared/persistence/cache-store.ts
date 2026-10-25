import AsyncStorage from "@react-native-async-storage/async-storage";

export const CACHE_PREFIX = "@dowell/cache";
export const INDEX_PREFIX = "@dowell/cache_index";
export const MAX_CACHE_ENTRIES_PER_USER = 50;
export const MAX_CACHE_PAYLOAD_BYTES = 500 * 1024; // 500 KB safety cap

export interface CacheEnvelope<T> {
  data: T;
  cachedAt: string;
  userId: string;
  version: number;
  key: string;
  byteSize: number;
}

interface UserIndexItem {
  key: string;
  cachedAt: string;
}

function makeStorageKey(userId: string, key: string): string {
  const safeUser = userId || "anonymous";
  return `${CACHE_PREFIX}/${safeUser}/${key}`;
}

function makeIndexKey(userId: string): string {
  const safeUser = userId || "anonymous";
  return `${INDEX_PREFIX}/${safeUser}`;
}

export interface CacheStore {
  get<T>(userId: string, key: string): Promise<CacheEnvelope<T> | null>;
  set<T>(
    userId: string,
    key: string,
    data: T,
    version?: number,
  ): Promise<CacheEnvelope<T>>;
  remove(userId: string, key: string): Promise<void>;
  purgeUser(userId: string): Promise<void>;
  clearAll(): Promise<void>;
}

export function createCacheStore(storage = AsyncStorage): CacheStore {
  async function readIndex(userId: string): Promise<UserIndexItem[]> {
    try {
      const raw = await storage.getItem(makeIndexKey(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async function writeIndex(
    userId: string,
    index: UserIndexItem[],
  ): Promise<void> {
    try {
      await storage.setItem(makeIndexKey(userId), JSON.stringify(index));
    } catch {
      // Ignore index persistence failures
    }
  }

  return {
    async get<T>(
      userId: string,
      key: string,
    ): Promise<CacheEnvelope<T> | null> {
      try {
        const raw = await storage.getItem(makeStorageKey(userId, key));
        if (!raw) return null;
        const envelope: CacheEnvelope<T> = JSON.parse(raw);

        // Security assertion: must match requested userId
        const safeUser = userId || "anonymous";
        if (envelope.userId !== safeUser) {
          await storage.removeItem(makeStorageKey(userId, key));
          return null;
        }

        return envelope;
      } catch {
        return null;
      }
    },

    async set<T>(
      userId: string,
      key: string,
      data: T,
      version = 1,
    ): Promise<CacheEnvelope<T>> {
      const safeUser = userId || "anonymous";
      const now = new Date().toISOString();
      const serializedData = JSON.stringify(data);
      const byteSize = serializedData.length;

      if (byteSize > MAX_CACHE_PAYLOAD_BYTES) {
        throw new Error(
          `Payload exceeds maximum allowable cache size of ${MAX_CACHE_PAYLOAD_BYTES} bytes.`,
        );
      }

      const envelope: CacheEnvelope<T> = {
        data,
        cachedAt: now,
        userId: safeUser,
        version,
        key,
        byteSize,
      };

      // Manage index and evict oldest if exceeding max entries
      const currentIndex = await readIndex(userId);
      const filteredIndex = currentIndex.filter((item) => item.key !== key);

      // Evict oldest if exceeding capacity
      while (filteredIndex.length >= MAX_CACHE_ENTRIES_PER_USER) {
        const oldest = filteredIndex.shift();
        if (oldest) {
          try {
            await storage.removeItem(makeStorageKey(userId, oldest.key));
          } catch {
            // Best effort removal
          }
        }
      }

      filteredIndex.push({ key, cachedAt: now });

      await storage.setItem(
        makeStorageKey(userId, key),
        JSON.stringify(envelope),
      );
      await writeIndex(userId, filteredIndex);

      return envelope;
    },

    async remove(userId: string, key: string): Promise<void> {
      await storage.removeItem(makeStorageKey(userId, key));
      const currentIndex = await readIndex(userId);
      const filtered = currentIndex.filter((item) => item.key !== key);
      await writeIndex(userId, filtered);
    },

    async purgeUser(userId: string): Promise<void> {
      const index = await readIndex(userId);
      for (const item of index) {
        try {
          await storage.removeItem(makeStorageKey(userId, item.key));
        } catch {
          // Best effort
        }
      }
      await storage.removeItem(makeIndexKey(userId));
    },

    async clearAll(): Promise<void> {
      try {
        const allKeys = await storage.getAllKeys();
        const cacheKeys = allKeys.filter(
          (k) => k.startsWith(CACHE_PREFIX) || k.startsWith(INDEX_PREFIX),
        );
        if (cacheKeys.length > 0) {
          await storage.multiRemove(cacheKeys);
        }
      } catch {
        // Best effort
      }
    },
  };
}

export const cacheStore = createCacheStore();
