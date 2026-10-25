import {
  DISCOVERY_CATEGORY_OPTIONS,
  DISCOVERY_DISTANCE_OPTIONS,
  DISCOVERY_WORK_MODE_OPTIONS,
  DiscoveryFiltersSchema,
  DiscoveryGigCardSchema,
} from "../discovery-schemas";

describe("discovery schemas", () => {
  it("provides expected filter options", () => {
    expect(DISCOVERY_WORK_MODE_OPTIONS).toContain("all");
    expect(DISCOVERY_WORK_MODE_OPTIONS).toContain("remote");
    expect(DISCOVERY_WORK_MODE_OPTIONS).toContain("onsite");
    expect(DISCOVERY_CATEGORY_OPTIONS).toContain("all");
    expect(DISCOVERY_CATEGORY_OPTIONS).toContain("cleaning");
    expect(DISCOVERY_DISTANCE_OPTIONS.length).toBeGreaterThanOrEqual(3);
  });

  it("validates and defaults DiscoveryFilters", () => {
    const empty = {};
    const parsed = DiscoveryFiltersSchema.parse(empty);
    expect(parsed.workMode).toBe("all");
    expect(parsed.category).toBe("all");
    expect(parsed.maxDistanceKm).toBeNull();
    expect(parsed.searchQuery).toBe("");
  });

  it("validates DiscoveryGigCard from database output", () => {
    const card = {
      id: "a0000000-0000-4000-8000-000000000001",
      employerId: "e0000000-0000-4000-8000-000000000001",
      title: "Makati House Deep Cleaning",
      description:
        "Deep clean master bedroom, kitchen counters, and mop living room tile floor.",
      category: "cleaning",
      workMode: "onsite",
      publicArea: "Poblacion, Makati",
      publicLatitude: 14.5547,
      publicLongitude: 121.0244,
      budgetAmount: 1200,
      currency: "PHP",
      status: "published",
      distanceKm: 3.2,
      publishedAt: "2026-10-25T01:00:00.000Z",
      createdAt: "2026-10-25T00:00:00.000Z",
      reasons: ["Within 5 km of you", "Recently posted"],
    };

    const parsed = DiscoveryGigCardSchema.safeParse(card);
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid UUID in DiscoveryGigCard", () => {
    const card = {
      id: "not-a-uuid",
      employerId: "e0000000-0000-4000-8000-000000000001",
      title: "Test",
      description: "Desc",
      category: "cleaning",
      workMode: "onsite",
      publicArea: "Makati",
      publicLatitude: 14.5,
      publicLongitude: 121.0,
      budgetAmount: 1000,
      currency: "PHP",
      status: "published",
      distanceKm: null,
      publishedAt: null,
      createdAt: "2026-10-25T00:00:00.000Z",
      reasons: [],
    };

    expect(DiscoveryGigCardSchema.safeParse(card).success).toBe(false);
  });
});
