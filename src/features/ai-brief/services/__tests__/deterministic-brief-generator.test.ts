import { JobBriefDraftSchema } from "../../model/ai-brief-schemas";
import { generateDeterministicBrief } from "../deterministic-brief-generator";

describe("generateDeterministicBrief", () => {
  it("generates a valid schema-compliant draft for onsite errand", () => {
    const facts = {
      taskSummary: "Need assistance assembling two office desks in room 302.",
      category: "errands" as const,
      workMode: "onsite" as const,
      publicArea: "Makati Central Business District",
      budgetPhp: 1500,
      dueAt: null,
      tasks: [],
      skills: ["Assembly"],
      constraints: ["Bring hex key set"],
    };

    const draft = generateDeterministicBrief(facts);
    expect(() => JobBriefDraftSchema.parse(draft)).not.toThrow();
    expect(draft.category).toBe("errands");
    expect(draft.workMode).toBe("onsite");
    expect(draft.title.length).toBeGreaterThanOrEqual(5);
    expect(draft.description).toContain("Makati Central Business District");
    expect(draft.tasks.length).toBeGreaterThanOrEqual(1);
    expect(draft.safetyNotes.length).toBeGreaterThanOrEqual(1);
  });

  it("incorporates custom tasks when provided by user", () => {
    const facts = {
      taskSummary: "Condo move-out cleaning before lease inspection.",
      category: "cleaning" as const,
      workMode: "onsite" as const,
      publicArea: "BGC, Taguig",
      tasks: [
        "Wipe all kitchen cabinets and degrease range hood",
        "Mop living room and bedroom hardwood floors",
      ],
      skills: ["Housekeeping"],
      constraints: [],
    };

    const draft = generateDeterministicBrief(facts);
    expect(draft.tasks).toHaveLength(2);
    expect(draft.tasks[0]?.description).toBe(
      "Wipe all kitchen cabinets and degrease range hood",
    );
    expect(draft.tasks[0]?.acceptanceCriterion).toContain(
      "Completed satisfactorily",
    );
  });

  it("handles remote engagements correctly with appropriate assumptions", () => {
    const facts = {
      taskSummary: "Translate 5 product user guides from English to Tagalog.",
      category: "digital" as const,
      workMode: "remote" as const,
      publicArea: null,
      budgetPhp: 3000,
      tasks: [],
      skills: ["English to Tagalog translation", "Copywriting"],
      constraints: ["Strict 48-hour delivery"],
    };

    const draft = generateDeterministicBrief(facts);
    expect(draft.workMode).toBe("remote");
    expect(draft.description).toContain("remote engagement");
    expect(draft.assumptions[0]).toContain("stable internet");
  });
});
