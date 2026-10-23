import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

import type { AuthProfile } from "../../auth/model/auth-state";

type StorageLike = Readonly<{
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}>;

const snapshotSchema = z.object({
  userId: z.string().min(1),
  onboardingCompleted: z.boolean(),
});

export type ProfileGateSnapshot = z.infer<typeof snapshotSchema>;
export type ProfileGateStore = Readonly<{
  read: (userId: string) => Promise<ProfileGateSnapshot | null>;
  save: (profile: AuthProfile) => Promise<void>;
  remove: (userId: string) => Promise<void>;
}>;

function keyFor(userId: string): string {
  return `do-well.profile-gate.v1:${encodeURIComponent(userId)}`;
}

export function createProfileGateStore(storage: StorageLike): ProfileGateStore {
  return {
    async read(userId) {
      const key = keyFor(userId);
      const value = await storage.getItem(key);
      if (value === null) return null;
      try {
        const parsed = snapshotSchema.safeParse(JSON.parse(value));
        if (parsed.success && parsed.data.userId === userId) return parsed.data;
      } catch {
        // Invalid app-owned cache data is removed below and never used as authority.
      }
      await storage.removeItem(key);
      return null;
    },
    async save(profile) {
      const snapshot = snapshotSchema.parse({
        userId: profile.id,
        onboardingCompleted: profile.onboardingCompletedAt !== null,
      });
      await storage.setItem(keyFor(profile.id), JSON.stringify(snapshot));
    },
    remove: (userId) => storage.removeItem(keyFor(userId)),
  };
}

export const profileGateStore = createProfileGateStore(AsyncStorage);
