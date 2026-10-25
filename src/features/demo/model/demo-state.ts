import {
  DemoStateSchema,
  type DemoPersona,
  type DemoState,
} from "./demo-schema";

export const DEMO_EMPLOYER = {
  id: "demo-employer",
  role: "employer",
  displayName: "Maya Santos",
} as const satisfies DemoPersona;

export const DEMO_WORKER = {
  id: "demo-worker",
  role: "worker",
  displayName: "Alex Reyes",
} as const satisfies DemoPersona;

export const DEMO_PERSONAS = [DEMO_EMPLOYER, DEMO_WORKER] as const;

export function createEmptyDemoState(): DemoState {
  return DemoStateSchema.parse({
    schemaVersion: 1,
    activePersona: "employer",
    gigs: [],
    applications: [],
    assignments: [],
    activity: [],
  });
}
