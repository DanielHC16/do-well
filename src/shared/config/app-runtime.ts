import { z } from "zod";

const invalidRuntimeMessage = "Public application runtime is invalid";

const appRuntimeSchema = z.enum(["production", "demo"]);

export type AppRuntime = z.infer<typeof appRuntimeSchema>;

export function parseAppRuntime(value: unknown): AppRuntime {
  const parsed = appRuntimeSchema.safeParse(value ?? "production");

  if (!parsed.success) {
    throw new Error(invalidRuntimeMessage);
  }

  return parsed.data;
}

export function readAppRuntime(): AppRuntime {
  return parseAppRuntime(process.env.EXPO_PUBLIC_APP_RUNTIME);
}
