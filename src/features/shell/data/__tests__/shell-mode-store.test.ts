import { createShellModeStore } from "../shell-mode-store";

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

describe("shell mode store", () => {
  it("defaults to worker mode and persists per user", async () => {
    const { storage, values } = createStorage();
    const store = createShellModeStore(storage);

    await expect(store.read("user-a")).resolves.toBe("worker");
    await store.save("user-a", "employer");
    await store.save("user-b", "worker");

    expect(values.get("do-well.shell-mode.v1:user-a")).toBe("employer");
    expect(values.get("do-well.shell-mode.v1:user-b")).toBe("worker");
    await expect(store.read("user-a")).resolves.toBe("employer");
  });

  it("removes invalid app-owned values and recovers to worker mode", async () => {
    const { storage, values } = createStorage();
    values.set("do-well.shell-mode.v1:user-a", "administrator");
    const store = createShellModeStore(storage);

    await expect(store.read("user-a")).resolves.toBe("worker");
    expect(storage.removeItem).toHaveBeenCalledWith(
      "do-well.shell-mode.v1:user-a",
    );
  });

  it("rejects blank user identifiers before touching storage", async () => {
    const { storage } = createStorage();
    const store = createShellModeStore(storage);

    await expect(store.read(" ")).rejects.toThrow(
      "Shell mode user is invalid.",
    );
    expect(storage.getItem).not.toHaveBeenCalled();
  });
});
