import {
  GIG_CATEGORIES,
  GIG_CATEGORY_LABELS,
  GIG_WORK_MODES,
  GigDraftFormSchema,
  GigRecordSchema,
} from "../gig-schemas";

describe("Gig schemas", () => {
  it("contains exactly the 8 approved marketplace categories", () => {
    expect(GIG_CATEGORIES).toEqual([
      "errands",
      "delivery",
      "cleaning",
      "events",
      "admin",
      "tutoring",
      "digital",
      "other",
    ]);
    expect(Object.keys(GIG_CATEGORY_LABELS)).toHaveLength(8);
  });

  it("contains the 3 work modes", () => {
    expect(GIG_WORK_MODES).toEqual(["onsite", "remote", "hybrid"]);
  });
});

describe("GigDraftFormSchema", () => {
  it("validates a complete onsite gig draft", () => {
    const valid = {
      title: "Clean 2BR Condo in Poblacion",
      description:
        "Deep clean master bedroom, kitchen counters, and mop living room tile floor.",
      category: "cleaning",
      workMode: "onsite",
      publicArea: "Poblacion, Makati",
      budgetAmount: 1200,
      currency: "PHP",
    };

    const result = GigDraftFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("validates a remote gig draft without publicArea", () => {
    const valid = {
      title: "Create Canva graphics for community bakery",
      description:
        "Design 5 Instagram post templates using our bakery photo assets and colors.",
      category: "digital",
      workMode: "remote",
      publicArea: null,
      budgetAmount: 850,
      currency: "PHP",
    };

    const result = GigDraftFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects onsite gig without publicArea", () => {
    const invalid = {
      title: "Clean 2BR Condo in Poblacion",
      description:
        "Deep clean master bedroom, kitchen counters, and mop living room tile floor.",
      category: "cleaning",
      workMode: "onsite",
      publicArea: null,
      budgetAmount: 1200,
      currency: "PHP",
    };

    const result = GigDraftFormSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(
        /Neighborhood area is required/i,
      );
    }
  });

  it("rejects remote gig with publicArea set", () => {
    const invalid = {
      title: "Create Canva graphics for community bakery",
      description:
        "Design 5 Instagram post templates using our bakery photo assets and colors.",
      category: "digital",
      workMode: "remote",
      publicArea: "Makati",
      budgetAmount: 850,
      currency: "PHP",
    };

    const result = GigDraftFormSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(
        /Remote gigs must not specify an area/i,
      );
    }
  });

  it("rejects title shorter than 5 chars or longer than 100 chars", () => {
    const shortTitle = {
      title: "Fix",
      description: "Need someone to fix leaking faucet under kitchen sink.",
      category: "errands",
      workMode: "onsite",
      publicArea: "Pasig",
      budgetAmount: 500,
      currency: "PHP",
    };
    expect(GigDraftFormSchema.safeParse(shortTitle).success).toBe(false);

    const longTitle = {
      title: "A".repeat(101),
      description: "Need someone to fix leaking faucet under kitchen sink.",
      category: "errands",
      workMode: "onsite",
      publicArea: "Pasig",
      budgetAmount: 500,
      currency: "PHP",
    };
    expect(GigDraftFormSchema.safeParse(longTitle).success).toBe(false);
  });

  it("rejects description shorter than 20 characters", () => {
    const shortDesc = {
      title: "Need help cleaning",
      description: "Too short",
      category: "cleaning",
      workMode: "onsite",
      publicArea: "Makati",
      budgetAmount: 500,
      currency: "PHP",
    };
    expect(GigDraftFormSchema.safeParse(shortDesc).success).toBe(false);
  });

  it("rejects negative or zero budget", () => {
    const zeroBudget = {
      title: "Deliver documents to QC hall",
      description: "Pick up sealed folder from office and deliver to QC hall.",
      category: "delivery",
      workMode: "onsite",
      publicArea: "QC",
      budgetAmount: 0,
      currency: "PHP",
    };
    expect(GigDraftFormSchema.safeParse(zeroBudget).success).toBe(false);

    const negativeBudget = {
      ...zeroBudget,
      budgetAmount: -100,
    };
    expect(GigDraftFormSchema.safeParse(negativeBudget).success).toBe(false);
  });

  it("rejects unknown category", () => {
    const invalid = {
      title: "Perform financial accounting audit",
      description: "Audit ledger spreadsheets and prepare balance reports.",
      category: "accounting",
      workMode: "remote",
      publicArea: null,
      budgetAmount: 500,
      currency: "PHP",
    };
    expect(GigDraftFormSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("GigRecordSchema", () => {
  it("validates an existing database gig row", () => {
    const row = {
      id: "a0000000-0000-4000-8000-000000000001",
      employerId: "e0000000-0000-4000-8000-000000000001",
      title: "Organize Warehouse Shelves",
      description:
        "Sort packages alphabetically and log arrival numbers onto worksheet.",
      category: "admin",
      workMode: "onsite",
      publicArea: "BGC, Taguig",
      publicLatitude: 14.54,
      publicLongitude: 121.05,
      budgetAmount: 1500,
      currency: "PHP",
      status: "published",
      applicationDeadline: null,
      dueAt: null,
      publishedAt: "2026-10-25T08:00:00.000Z",
      closedAt: null,
      createdAt: "2026-10-25T07:00:00.000Z",
      updatedAt: "2026-10-25T08:00:00.000Z",
    };

    const result = GigRecordSchema.safeParse(row);
    expect(result.success).toBe(true);
  });
});
