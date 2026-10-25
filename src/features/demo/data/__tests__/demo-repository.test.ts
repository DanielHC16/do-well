import { createDemoSeed } from "../demo-seed";
import {
  createDemoRepository,
  DEMO_STATE_STORAGE_KEY,
} from "../demo-repository";

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

describe("demo repository", () => {
  it("creates and persists the deterministic seed when state is missing", async () => {
    const { storage, values } = createStorage();
    const repository = createDemoRepository(storage);

    const result = await repository.load();

    expect(result).toEqual({ state: createDemoSeed(), recoveryError: null });
    expect(storage.setItem).toHaveBeenCalledWith(
      DEMO_STATE_STORAGE_KEY,
      JSON.stringify(createDemoSeed()),
    );
    expect([...values.keys()]).toEqual([DEMO_STATE_STORAGE_KEY]);
  });

  it("loads a valid state without rewriting it", async () => {
    const { storage, values } = createStorage();
    const state = { ...createDemoSeed(), activePersona: "worker" as const };
    values.set(DEMO_STATE_STORAGE_KEY, JSON.stringify(state));
    const repository = createDemoRepository(storage);

    await expect(repository.load()).resolves.toEqual({
      state,
      recoveryError: null,
    });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it.each(["not json", JSON.stringify({ schemaVersion: 99 })])(
    "replaces corrupt state and returns a non-sensitive recovery error: %s",
    async (value) => {
      const { storage, values } = createStorage();
      values.set(DEMO_STATE_STORAGE_KEY, value);
      const repository = createDemoRepository(storage);

      const result = await repository.load();

      expect(result.state).toEqual(createDemoSeed());
      expect(result.recoveryError).toEqual({
        code: "CORRUPTED_STATE_RECOVERED",
        message: "Saved demo data was invalid and has been reset.",
      });
      expect(JSON.stringify(result.recoveryError)).not.toContain(value);
      expect(values.get(DEMO_STATE_STORAGE_KEY)).toBe(
        JSON.stringify(createDemoSeed()),
      );
    },
  );

  it("serializes rapid saves so an older write cannot finish last", async () => {
    const values = new Map<string, string>();
    const releases: (() => void)[] = [];
    const storage = {
      getItem: jest.fn(async (key: string) => values.get(key) ?? null),
      setItem: jest.fn(
        (key: string, value: string) =>
          new Promise<void>((resolve) => {
            releases.push(() => {
              values.set(key, value);
              resolve();
            });
          }),
      ),
      removeItem: jest.fn(async (key: string) => {
        values.delete(key);
      }),
    };
    const repository = createDemoRepository(storage);
    const employerState = createDemoSeed();
    const workerState = { ...employerState, activePersona: "worker" as const };

    const first = repository.save(employerState);
    const second = repository.save(workerState);
    await Promise.resolve();
    await Promise.resolve();
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    releases.shift()?.();
    await first;
    await Promise.resolve();
    await Promise.resolve();
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    releases.shift()?.();
    await second;

    expect(values.get(DEMO_STATE_STORAGE_KEY)).toBe(
      JSON.stringify(workerState),
    );
  });

  it("resets exactly the versioned demo key to the deterministic seed", async () => {
    const { storage, values } = createStorage();
    values.set(DEMO_STATE_STORAGE_KEY, "old demo state");
    values.set("unrelated.key", "keep me");
    const repository = createDemoRepository(storage);

    await expect(repository.reset()).resolves.toEqual(createDemoSeed());

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(
      "do-well.demo.state.v1",
      JSON.stringify(createDemoSeed()),
    );
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(values.get("unrelated.key")).toBe("keep me");
  });

  it("rejects invalid state before persistence", async () => {
    const { storage } = createStorage();
    const repository = createDemoRepository(storage);

    await expect(repository.save({ schemaVersion: 2 })).rejects.toThrow(
      "Demo state is invalid and was not saved.",
    );
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
