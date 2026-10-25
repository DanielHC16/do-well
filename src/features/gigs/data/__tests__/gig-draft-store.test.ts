import { createGigDraftStore } from "../gig-draft-store";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

function createStorage() {
  const values = new Map<string, string>();
  return {
    values,
    storage: {
      getItem: jest.fn(async (key: string) => values.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        values.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        values.delete(key);
      }),
    },
  };
}

describe("gig draft store", () => {
  it("saves, reads, and clears local draft per user", async () => {
    const { storage, values } = createStorage();
    const store = createGigDraftStore(storage);

    await expect(store.read("user-1")).resolves.toBeNull();

    const draft = {
      title: "Clean Backyard",
      description: "Clearing branches and leaves from garden.",
      category: "cleaning" as const,
      workMode: "onsite" as const,
      publicArea: "Makati",
      budgetAmount: 500,
      currency: "PHP" as const,
    };

    await store.save("user-1", draft);
    expect(values.get("do-well.gig-draft.v1:user-1")).toBe(
      JSON.stringify(draft),
    );

    const loaded = await store.read("user-1");
    expect(loaded).toEqual(draft);

    await store.clear("user-1");
    await expect(store.read("user-1")).resolves.toBeNull();
  });

  it("recovers safely from invalid JSON", async () => {
    const { storage, values } = createStorage();
    values.set("do-well.gig-draft.v1:user-1", "not-json");
    const store = createGigDraftStore(storage);

    await expect(store.read("user-1")).resolves.toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(
      "do-well.gig-draft.v1:user-1",
    );
  });

  it("rejects blank user identifiers", async () => {
    const { storage } = createStorage();
    const store = createGigDraftStore(storage);

    await expect(store.read(" ")).rejects.toThrow("Gig draft user is invalid.");
    expect(storage.getItem).not.toHaveBeenCalled();
  });
});
