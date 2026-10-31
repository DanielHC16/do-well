import { APPLICATION_STATUSES } from "@/features/applications/model/application-schemas";
import {
  ASSIGNMENT_STATUSES,
  MILESTONE_STATUSES,
} from "@/features/assignments/model/assignment-schemas";
import { GIG_STATUSES } from "@/features/gigs/model/gig-schemas";

import { badgeFor, BADGES } from "../status-model";

describe("status badge model", () => {
  it("maps every real backend status to a labelled badge", () => {
    for (const status of APPLICATION_STATUSES)
      expect(badgeFor("application", status).label).toBeTruthy();
    for (const status of ASSIGNMENT_STATUSES)
      expect(badgeFor("assignment", status).label).toBeTruthy();
    for (const status of MILESTONE_STATUSES)
      expect(badgeFor("milestone", status).label).toBeTruthy();
    for (const status of GIG_STATUSES)
      expect(badgeFor("gig", status).label).toBeTruthy();
  });

  it("uses the product vocabulary for the workflow", () => {
    expect(badgeFor("application", "pending")).toEqual(BADGES.applied);
    expect(badgeFor("application", "accepted")).toEqual(BADGES.selected);
    expect(badgeFor("assignment", "active")).toEqual(BADGES.inProgress);
    expect(badgeFor("assignment", "submitted")).toEqual(BADGES.submitted);
    expect(badgeFor("assignment", "revision_requested")).toEqual(
      BADGES.revisionRequested,
    );
    expect(badgeFor("milestone", "approved")).toEqual(BADGES.approved);
    expect(badgeFor("assignment", "completed")).toEqual(BADGES.completed);
  });

  it("never invents a shortlist state (no backend support)", () => {
    expect(BADGES.shortlisted.tone).toBe("info");
    const used = [...APPLICATION_STATUSES].map(
      (status) => badgeFor("application", status).label,
    );
    expect(used).not.toContain("Shortlisted");
  });

  it("falls back to a neutral humanized label for unknown values", () => {
    expect(badgeFor("gig", "some_new_state")).toEqual({
      label: "Some new state",
      tone: "neutral",
    });
  });
});
