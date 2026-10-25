import AsyncStorage from "@react-native-async-storage/async-storage";

export const APPLICATION_DRAFT_PREFIX = "@dowell/draft/app";

export interface ApplicationDraft {
  gigId: string;
  workerId: string;
  pitchNote: string;
  proposedRate: number;
  updatedAt: string;
}

function makeDraftKey(workerId: string, gigId: string): string {
  const safeUser = workerId || "anonymous";
  return `${APPLICATION_DRAFT_PREFIX}/${safeUser}/${gigId}`;
}

export interface ApplicationDraftStore {
  getDraft(workerId: string, gigId: string): Promise<ApplicationDraft | null>;
  saveDraft(draft: ApplicationDraft): Promise<void>;
  clearDraft(workerId: string, gigId: string): Promise<void>;
  listUserDrafts(workerId: string): Promise<ApplicationDraft[]>;
}

export function createApplicationDraftStore(
  storage = AsyncStorage,
): ApplicationDraftStore {
  return {
    async getDraft(
      workerId: string,
      gigId: string,
    ): Promise<ApplicationDraft | null> {
      try {
        const raw = await storage.getItem(makeDraftKey(workerId, gigId));
        if (!raw) return null;
        const parsed: ApplicationDraft = JSON.parse(raw);
        if (parsed.workerId !== workerId) {
          await storage.removeItem(makeDraftKey(workerId, gigId));
          return null;
        }
        return parsed;
      } catch {
        return null;
      }
    },

    async saveDraft(draft: ApplicationDraft): Promise<void> {
      try {
        const key = makeDraftKey(draft.workerId, draft.gigId);
        await storage.setItem(key, JSON.stringify(draft));
      } catch {
        // Best effort draft saving
      }
    },

    async clearDraft(workerId: string, gigId: string): Promise<void> {
      try {
        await storage.removeItem(makeDraftKey(workerId, gigId));
      } catch {
        // Best effort
      }
    },

    async listUserDrafts(workerId: string): Promise<ApplicationDraft[]> {
      try {
        const prefix = `${APPLICATION_DRAFT_PREFIX}/${workerId}/`;
        const allKeys = await storage.getAllKeys();
        const userKeys = allKeys.filter((k) => k.startsWith(prefix));
        if (userKeys.length === 0) return [];

        const items: ApplicationDraft[] = [];
        for (const k of userKeys) {
          const raw = await storage.getItem(k);
          if (raw) {
            try {
              items.push(JSON.parse(raw));
            } catch {
              // Ignore corrupt draft
            }
          }
        }
        return items;
      } catch {
        return [];
      }
    },
  };
}

export const applicationDraftStore = createApplicationDraftStore();
