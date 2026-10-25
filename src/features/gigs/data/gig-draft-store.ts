import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

import type { GigDraftFormInput } from "../model/gig-schemas";

type StorageLike = Readonly<{
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}>;

const UserIdSchema = z.string().trim().min(1).max(200);

export type GigDraftData = Partial<GigDraftFormInput>;

export type GigDraftStore = Readonly<{
  read: (userId: string) => Promise<GigDraftData | null>;
  save: (userId: string, draft: GigDraftData) => Promise<void>;
  clear: (userId: string) => Promise<void>;
}>;

function keyFor(userIdInput: string): string {
  const parsed = UserIdSchema.safeParse(userIdInput);
  if (!parsed.success) throw new Error("Gig draft user is invalid.");
  return `do-well.gig-draft.v1:${encodeURIComponent(parsed.data)}`;
}

export function createGigDraftStore(storage: StorageLike): GigDraftStore {
  return {
    async read(userId) {
      const key = keyFor(userId);
      const stored = await storage.getItem(key);
      if (stored === null) return null;

      try {
        const parsed = JSON.parse(stored);
        if (typeof parsed === "object" && parsed !== null) {
          return parsed as GigDraftData;
        }
        await storage.removeItem(key);
        return null;
      } catch {
        await storage.removeItem(key);
        return null;
      }
    },

    async save(userId, draft) {
      const key = keyFor(userId);
      await storage.setItem(key, JSON.stringify(draft));
    },

    async clear(userId) {
      const key = keyFor(userId);
      await storage.removeItem(key);
    },
  };
}

export const gigDraftStore = createGigDraftStore(AsyncStorage);
