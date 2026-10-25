import { createSubmissionDraftStore } from "../submission-draft-store";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe("submissionDraftStore", () => {
  let storeMap: Record<string, string> = {};

  const mockStorage = {
    getItem: jest.fn(async (key: string) => storeMap[key] ?? null),
    setItem: jest.fn(async (key: string, val: string) => {
      storeMap[key] = val;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete storeMap[key];
    }),
  };

  beforeEach(() => {
    storeMap = {};
    jest.clearAllMocks();
  });

  it("saves and restores a submission draft including uploaded file attempts", async () => {
    const store = createSubmissionDraftStore(mockStorage as any);
    const draft = {
      assignmentId: "asg-100",
      workerId: "w-200",
      milestoneId: null,
      note: "Work completed with 2 photos.",
      clientRequestId: "req-1",
      images: [
        {
          uri: "file:///photo1.jpg",
          fileName: "photo1.jpg",
          fileSize: 1024,
          mimeType: "image/jpeg" as const,
          width: 800,
          height: 600,
        },
      ],
      completedUploads: {
        "file-uuid-1": {
          objectPath: "w-200/asg-100/sub-1/file-uuid-1.jpg",
          mimeType: "image/jpeg" as const,
          byteSize: 1024,
        },
      },
      updatedAt: "2026-10-25T13:00:00.000Z",
    };

    await store.saveDraft(draft);

    const retrieved = await store.getDraft("w-200", "asg-100");
    expect(retrieved).toEqual(draft);
    expect(retrieved?.completedUploads["file-uuid-1"]).toBeDefined();
  });

  it("isolates drafts by worker and clears upon submission completion", async () => {
    const store = createSubmissionDraftStore(mockStorage as any);
    const draft = {
      assignmentId: "asg-100",
      workerId: "w-200",
      milestoneId: null,
      note: "Note",
      clientRequestId: "req-1",
      images: [],
      completedUploads: {},
      updatedAt: "2026-10-25T13:00:00.000Z",
    };

    await store.saveDraft(draft);

    // Another worker cannot see this draft
    expect(await store.getDraft("w-other", "asg-100")).toBeNull();

    // Clear draft
    await store.clearDraft("w-200", "asg-100");
    expect(await store.getDraft("w-200", "asg-100")).toBeNull();
  });
});
