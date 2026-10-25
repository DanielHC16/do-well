import { DemoStateSchema, type DemoState } from "../model/demo-schema";
import { DEMO_EMPLOYER } from "../model/demo-state";

const seedDocument = {
  schemaVersion: 1,
  activePersona: "employer",
  gigs: [
    {
      id: "demo-gig-delivery",
      employerId: DEMO_EMPLOYER.id,
      title: "Pick up event supplies",
      description:
        "Pick up sealed event supplies and deliver them to the community venue.",
      category: "delivery",
      workMode: "onsite",
      publicArea: "Manila",
      budgetAmount: 750,
      status: "published",
      createdAt: "2026-10-25T00:00:00.000Z",
    },
    {
      id: "demo-gig-spreadsheet",
      employerId: DEMO_EMPLOYER.id,
      title: "Prepare event spreadsheet",
      description:
        "Clean and organize a synthetic event attendance spreadsheet for review.",
      category: "admin",
      workMode: "remote",
      publicArea: null,
      budgetAmount: 1_200,
      status: "published",
      createdAt: "2026-10-25T00:01:00.000Z",
    },
  ],
  applications: [],
  assignments: [],
  activity: [
    {
      id: "demo-activity-delivery-published",
      gigId: "demo-gig-delivery",
      assignmentId: null,
      actor: "employer",
      type: "gig_published",
      summary: "Published Pick up event supplies.",
      occurredAt: "2026-10-25T00:00:00.000Z",
    },
    {
      id: "demo-activity-spreadsheet-published",
      gigId: "demo-gig-spreadsheet",
      assignmentId: null,
      actor: "employer",
      type: "gig_published",
      summary: "Published Prepare event spreadsheet.",
      occurredAt: "2026-10-25T00:01:00.000Z",
    },
  ],
} as const;

export function createDemoSeed(): DemoState {
  return DemoStateSchema.parse(seedDocument);
}
