import AsyncStorage from "@react-native-async-storage/async-storage";

import { DemoStateSchema, type DemoState } from "../model/demo-schema";
import { createDemoSeed } from "./demo-seed";

export const DEMO_STATE_STORAGE_KEY = "do-well.demo.state.v1";

export type DemoStorage = Readonly<{
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}>;

export type DemoRecoveryError = Readonly<{
  code: "CORRUPTED_STATE_RECOVERED";
  message: "Saved demo data was invalid and has been reset.";
}>;

export type DemoLoadResult = Readonly<{
  state: DemoState;
  recoveryError: DemoRecoveryError | null;
}>;

export type DemoRepository = Readonly<{
  load: () => Promise<DemoLoadResult>;
  save: (state: unknown) => Promise<void>;
  reset: () => Promise<DemoState>;
}>;

const corruptionError: DemoRecoveryError = {
  code: "CORRUPTED_STATE_RECOVERED",
  message: "Saved demo data was invalid and has been reset.",
};

export function createDemoRepository(storage: DemoStorage): DemoRepository {
  let writeQueue: Promise<void> = Promise.resolve();

  function enqueueWrite(state: DemoState): Promise<void> {
    const serialized = JSON.stringify(state);
    const write = writeQueue
      .catch(() => undefined)
      .then(() => storage.setItem(DEMO_STATE_STORAGE_KEY, serialized));
    writeQueue = write;
    return write;
  }

  async function save(stateInput: unknown): Promise<void> {
    const parsed = DemoStateSchema.safeParse(stateInput);
    if (!parsed.success) {
      throw new Error("Demo state is invalid and was not saved.");
    }
    await enqueueWrite(parsed.data);
  }

  return {
    async load() {
      const value = await storage.getItem(DEMO_STATE_STORAGE_KEY);
      if (value === null) {
        const state = createDemoSeed();
        await enqueueWrite(state);
        return { state, recoveryError: null };
      }

      try {
        const parsed = DemoStateSchema.safeParse(JSON.parse(value));
        if (parsed.success) {
          return { state: parsed.data, recoveryError: null };
        }
      } catch {
        // Invalid app-owned state is replaced below without exposing its content.
      }

      const state = createDemoSeed();
      await enqueueWrite(state);
      return { state, recoveryError: corruptionError };
    },
    save,
    async reset() {
      const state = createDemoSeed();
      await enqueueWrite(state);
      return state;
    },
  };
}

export const demoRepository = createDemoRepository(AsyncStorage);
