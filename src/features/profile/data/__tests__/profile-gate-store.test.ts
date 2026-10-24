import { createProfileGateStore } from "../profile-gate-store";

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

describe("profile gate snapshot store", () => {
  it("stores only a user-keyed completion gate without profile PII", async () => {
    const { storage, values } = createStorage();
    const store = createProfileGateStore(storage);

    await store.save({
      id: "user-a",
      displayName: "Ada",
      homeArea: "Makati",
      onboardingCompletedAt: "2026-10-23T00:00:00.000Z",
    });

    await expect(store.read("user-a")).resolves.toEqual({
      userId: "user-a",
      onboardingCompleted: true,
    });
    const persisted = [...values.values()].join("");
    expect(persisted).not.toContain("Ada");
    expect(persisted).not.toContain("Makati");
  });

  it("does not return another user's or invalid snapshot", async () => {
    const { storage, values } = createStorage();
    const store = createProfileGateStore(storage);
    values.set(
      "do-well.profile-gate.v1:user-b",
      JSON.stringify({ userId: "user-a", onboardingCompleted: true }),
    );

    await expect(store.read("user-b")).resolves.toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(
      "do-well.profile-gate.v1:user-b",
    );
  });
});
