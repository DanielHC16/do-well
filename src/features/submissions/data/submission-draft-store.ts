import AsyncStorage from "@react-native-async-storage/async-storage";

import type { SelectedEvidenceImage } from "../model/submission-schemas";

export const SUBMISSION_DRAFT_PREFIX = "@dowell/draft/sub";

export interface CompletedUploadRecord {
  objectPath: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  byteSize: number;
}

export interface SubmissionDraft {
  assignmentId: string;
  workerId: string;
  milestoneId?: string | null;
  note: string;
  clientRequestId: string;
  images: SelectedEvidenceImage[];
  completedUploads: Record<string, CompletedUploadRecord>;
  updatedAt: string;
}

function makeKey(workerId: string, assignmentId: string): string {
  const safeUser = workerId || "anonymous";
  return `${SUBMISSION_DRAFT_PREFIX}/${safeUser}/${assignmentId}`;
}

export interface SubmissionDraftStore {
  getDraft(
    workerId: string,
    assignmentId: string,
  ): Promise<SubmissionDraft | null>;
  saveDraft(draft: SubmissionDraft): Promise<void>;
  clearDraft(workerId: string, assignmentId: string): Promise<void>;
}

export function createSubmissionDraftStore(
  storage = AsyncStorage,
): SubmissionDraftStore {
  return {
    async getDraft(
      workerId: string,
      assignmentId: string,
    ): Promise<SubmissionDraft | null> {
      try {
        const raw = await storage.getItem(makeKey(workerId, assignmentId));
        if (!raw) return null;
        const parsed: SubmissionDraft = JSON.parse(raw);
        if (parsed.workerId !== workerId) {
          await storage.removeItem(makeKey(workerId, assignmentId));
          return null;
        }
        return parsed;
      } catch {
        return null;
      }
    },

    async saveDraft(draft: SubmissionDraft): Promise<void> {
      try {
        const key = makeKey(draft.workerId, draft.assignmentId);
        await storage.setItem(key, JSON.stringify(draft));
      } catch {
        // Best effort
      }
    },

    async clearDraft(workerId: string, assignmentId: string): Promise<void> {
      try {
        await storage.removeItem(makeKey(workerId, assignmentId));
      } catch {
        // Best effort
      }
    },
  };
}

export const submissionDraftStore = createSubmissionDraftStore();
