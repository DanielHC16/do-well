import {
  AI_SCHEMA_VERSION,
  JobBriefDraftSchema,
  JobBriefFactsSchema,
  JobBriefRequestSchema,
  JobBriefResponseSchema,
} from "../ai-brief-schemas";

describe("JobBriefFactsSchema", () => {
  it("accepts valid facts for onsite gig with public area", () => {
    const valid = {
      taskSummary: "Need assistance assembling two ergonomic office desks.",
      category: "errands",
      workMode: "onsite",
      publicArea: "Legaspi Village, Makati",
      budgetPhp: 1200,
      tasks: ["Assemble table tops", "Fix metal legs securely"],
      skills: ["Furniture assembly", "Hand tools"],
      constraints: ["Must bring own hex keys"],
    };

    const parsed = JobBriefFactsSchema.parse(valid);
    expect(parsed.taskSummary).toContain("ergonomic office desks");
    expect(parsed.publicArea).toBe("Legaspi Village, Makati");
    expect(parsed.tasks).toHaveLength(2);
  });

  it("fails if onsite gig lacks public area", () => {
    const invalid = {
      taskSummary: "Need assistance assembling two ergonomic office desks.",
      category: "errands",
      workMode: "onsite",
      publicArea: "",
      budgetPhp: 1200,
    };

    expect(() => JobBriefFactsSchema.parse(invalid)).toThrow(
      /Public area is required for onsite or hybrid gigs/,
    );
  });

  it("allows remote gig without public area", () => {
    const validRemote = {
      taskSummary:
        "Design social media graphics for an upcoming weekend event.",
      category: "digital",
      workMode: "remote",
      publicArea: null,
      budgetPhp: 2500,
    };

    const parsed = JobBriefFactsSchema.parse(validRemote);
    expect(parsed.workMode).toBe("remote");
    expect(parsed.publicArea).toBeNull();
  });

  it("fails if task summary is shorter than 10 characters", () => {
    expect(() =>
      JobBriefFactsSchema.parse({
        taskSummary: "Too short",
        category: "errands",
        workMode: "remote",
      }),
    ).toThrow(/Task summary must be at least 10 characters/);
  });

  it("fails if budget is negative or zero", () => {
    expect(() =>
      JobBriefFactsSchema.parse({
        taskSummary: "Valid task summary for errands work.",
        category: "errands",
        workMode: "remote",
        budgetPhp: 0,
      }),
    ).toThrow();
  });
});

describe("JobBriefRequestSchema", () => {
  it("validates request with UUID and default locale", () => {
    const request = {
      requestId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      facts: {
        taskSummary: "Organize stockroom inventory and label boxes.",
        category: "admin",
        workMode: "onsite",
        publicArea: "Ortigas Center, Pasig",
      },
    };

    const parsed = JobBriefRequestSchema.parse(request);
    expect(parsed.requestId).toBe("3fa85f64-5717-4562-b3fc-2c963f66afa6");
    expect(parsed.locale).toBe("en-PH");
  });
});

describe("JobBriefDraftSchema", () => {
  it("validates valid draft with structured tasks", () => {
    const draft = {
      title: "Stockroom Inventory & Labeling",
      description:
        "Sort through inventory cartons, count units against delivery slips, and label bins neatly.",
      category: "admin",
      workMode: "onsite",
      tasks: [
        {
          description: "Count boxes and tally with packing list",
          acceptanceCriterion: "All 50 cartons accounted for in tally sheet",
        },
        {
          description: "Affix barcode labels on designated shelf bins",
          acceptanceCriterion: "Bins 1 to 10 clearly labeled with barcodes",
        },
      ],
      skills: ["Attention to detail", "Inventory counting"],
      assumptions: ["All cartons are on ground level"],
      safetyNotes: ["Wear work gloves while handling cardboard"],
    };

    const parsed = JobBriefDraftSchema.parse(draft);
    expect(parsed.title).toBe("Stockroom Inventory & Labeling");
    expect(parsed.tasks).toHaveLength(2);
  });

  it("fails if draft has no tasks", () => {
    const invalid = {
      title: "Stockroom Inventory",
      description: "Sort through inventory cartons and count units.",
      category: "admin",
      workMode: "onsite",
      tasks: [],
    };

    expect(() => JobBriefDraftSchema.parse(invalid)).toThrow(
      /Draft must include at least one task/,
    );
  });
});

describe("JobBriefResponseSchema", () => {
  it("validates compliant response payload", () => {
    const response = {
      schemaVersion: AI_SCHEMA_VERSION,
      requestId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      draft: {
        title: "Condo Move-in Cleaning",
        description:
          "Deep clean of 1-bedroom unit including bathroom, kitchen counters, and bedroom floors.",
        category: "cleaning",
        workMode: "onsite",
        tasks: [
          {
            description: "Scrub and disinfect bathroom tiles and fixtures",
            acceptanceCriterion:
              "Tiles free of soap scum; fixtures disinfected",
          },
        ],
        skills: ["Deep cleaning"],
        assumptions: ["Electricity and running water are active in unit"],
        safetyNotes: ["Ensure ventilation while using cleaning chemicals"],
      },
      meta: {
        provider: "deterministic",
        model: "rule-based-template-v1",
        promptVersion: "job-brief-v1",
        isFallback: true,
      },
    };

    const parsed = JobBriefResponseSchema.parse(response);
    expect(parsed.schemaVersion).toBe("1");
    expect(parsed.meta.isFallback).toBe(true);
  });
});
