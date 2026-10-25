import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

const seenEventIdsSchema = z.array(z.string().uuid()).max(100);
const KEY_PREFIX = "do-well:notification-events:v1:";
const INITIALIZED_KEY_PREFIX = "do-well:notification-events-initialized:v1:";

export type NotificationDedupeStore = Readonly<{
  list: (userId: string) => Promise<string[]>;
  mark: (userId: string, eventId: string) => Promise<void>;
  isInitialized: (userId: string) => Promise<boolean>;
  initialize: (userId: string, eventIds: string[]) => Promise<void>;
}>;

function keyFor(userId: string): string {
  return `${KEY_PREFIX}${encodeURIComponent(userId)}`;
}

function initializedKeyFor(userId: string): string {
  return `${INITIALIZED_KEY_PREFIX}${encodeURIComponent(userId)}`;
}

export function createNotificationDedupeStore(
  storage: Pick<typeof AsyncStorage, "getItem" | "setItem"> = AsyncStorage,
): NotificationDedupeStore {
  const list = async (userId: string): Promise<string[]> => {
    const raw = await storage.getItem(keyFor(userId));
    if (!raw) return [];
    try {
      const parsed = seenEventIdsSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : [];
    } catch {
      return [];
    }
  };

  return {
    list,

    async isInitialized(userId: string): Promise<boolean> {
      return (await storage.getItem(initializedKeyFor(userId))) === "1";
    },

    async initialize(userId: string, eventIds: string[]): Promise<void> {
      const validatedIds = seenEventIdsSchema.parse(eventIds.slice(0, 100));
      await storage.setItem(keyFor(userId), JSON.stringify(validatedIds));
      await storage.setItem(initializedKeyFor(userId), "1");
    },

    async mark(userId: string, eventId: string): Promise<void> {
      const validatedEventId = z.string().uuid().parse(eventId);
      const current = await list(userId);
      const next = [
        validatedEventId,
        ...current.filter((id) => id !== validatedEventId),
      ].slice(0, 100);
      await storage.setItem(keyFor(userId), JSON.stringify(next));
    },
  };
}

export const notificationDedupeStore = createNotificationDedupeStore();
