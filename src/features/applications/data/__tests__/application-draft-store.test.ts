import { createApplicationDraftStore } from "../application-draft-store";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
}));

describe("applicationDraftStore", () => {
  let storeMap: Record<string, string> = {};

  const mockStorage = {
    getItem: jest.fn(async (key: string) => storeMap[key] ?? null),
    setItem: jest.fn(async (key: string, val: string) => {
      storeMap[key] = val;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete storeMap[key];
    }),
    getAllKeys: jest.fn(async () => Object.keys(storeMap)),
  };

  beforeEach(() => {
    storeMap = {};
    jest.clearAllMocks();
  });

  it("saves and retrieves an application draft for a worker and gig", async () => {
    const draftStore = createApplicationDraftStore(mockStorage as any);
    const draft = {
      gigId: "gig-123",
      workerId: "worker-456",
      pitchNote: "I have 5 years experience in office assembly.",
      proposedRate: 2500,
      updatedAt: "2026-10-25T12:00:00.000Z",
    };

    await draftStore.saveDraft(draft);

    const retrieved = await draftStore.getDraft("worker-456", "gig-123");
    expect(retrieved).toEqual(draft);
  });

  it("enforces worker isolation and clears draft on command", async () => {
    const draftStore = createApplicationDraftStore(mockStorage as any);
    const draft = {
      gigId: "gig-123",
      workerId: "worker-456",
      pitchNote: "Pitch note",
      proposedRate: 2000,
      updatedAt: "2026-10-25T12:00:00.000Z",
    };

    await draftStore.saveDraft(draft);

    // Another worker cannot read worker-456's draft
    const leaked = await draftStore.getDraft("worker-999", "gig-123");
    expect(leaked).toBeNull();

    // Clear draft
    await draftStore.clearDraft("worker-456", "gig-123");
    const cleared = await draftStore.getDraft("worker-456", "gig-123");
    expect(cleared).toBeNull();
  });

  it("lists all drafts belonging to a specific worker", async () => {
    const draftStore = createApplicationDraftStore(mockStorage as any);
    await draftStore.saveDraft({
      gigId: "gig-1",
      workerId: "worker-A",
      pitchNote: "Note 1",
      proposedRate: 1000,
      updatedAt: "2026-10-25T12:00:00.000Z",
    });
    await draftStore.saveDraft({
      gigId: "gig-2",
      workerId: "worker-A",
      pitchNote: "Note 2",
      proposedRate: 1500,
      updatedAt: "2026-10-25T12:00:00.000Z",
    });
    await draftStore.saveDraft({
      gigId: "gig-3",
      workerId: "worker-B",
      pitchNote: "Note B",
      proposedRate: 2000,
      updatedAt: "2026-10-25T12:00:00.000Z",
    });

    const userDrafts = await draftStore.listUserDrafts("worker-A");
    expect(userDrafts.length).toBe(2);
    expect(userDrafts.map((d) => d.gigId).sort()).toEqual(["gig-1", "gig-2"]);
  });
});
