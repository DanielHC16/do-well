import AsyncStorage from "@react-native-async-storage/async-storage";

import { accountGateway } from "@/features/settings/data/account-gateway";
import { withTimeout } from "@/shared/api/network-timeout";

import {
  ShellModeSchema,
  ShellUserIdSchema,
  type ShellMode,
} from "../model/shell-mode";

type StorageLike = Readonly<{
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}>;

export type ShellModeStore = Readonly<{
  read: (userId: string) => Promise<ShellMode>;
  save: (userId: string, mode: ShellMode) => Promise<void>;
}>;

function keyFor(userIdInput: string): string {
  const userId = ShellUserIdSchema.safeParse(userIdInput);
  if (!userId.success) throw new Error("Shell mode user is invalid.");
  return `do-well.shell-mode.v1:${encodeURIComponent(userId.data)}`;
}

export function createShellModeStore(
  storage: StorageLike,
  readServerMode?: (userId: string) => Promise<ShellMode>,
): ShellModeStore {
  return {
    async read(userId) {
      const key = keyFor(userId);
      if (readServerMode) {
        try {
          const mode = ShellModeSchema.parse(
            await withTimeout(readServerMode(userId)),
          );
          // This cache is a navigation preference only; it grants no capability.
          await storage.setItem(key, mode);
          return mode;
        } catch {
          // A per-user local preference keeps navigation usable offline.
        }
      }
      const stored = await storage.getItem(key);
      if (stored === null) return "worker";

      const parsed = ShellModeSchema.safeParse(stored);
      if (parsed.success) return parsed.data;

      await storage.removeItem(key);
      return "worker";
    },
    async save(userId, modeInput) {
      const key = keyFor(userId);
      const mode = ShellModeSchema.parse(modeInput);
      await storage.setItem(key, mode);
    },
  };
}

export const shellModeStore = createShellModeStore(
  AsyncStorage,
  async (userId) =>
    (await accountGateway.getCapabilities(userId)).preferredMode,
);
