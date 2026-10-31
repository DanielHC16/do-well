import type { WorkItem } from "@/features/work/data/work-gateway";

import {
  buildEmployerStats,
  buildWorkerStats,
  countLabel,
} from "../home-stats";

function items(count: number, status = "pending"): WorkItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `id-${index}`,
    gigId: `gig-${index}`,
    title: "Task",
    status,
    amount: 100,
    dueAt: null,
    kind: "application" as const,
  }));
}

describe("home stats", () => {
  it("labels counts honestly, including the page cap", () => {
    expect(countLabel(0, false)).toBe("0");
    expect(countLabel(7, false)).toBe("7");
    expect(countLabel(20, true)).toBe("20+");
    expect(countLabel(null, false)).toBe("–");
  });

  it("builds worker tiles from real application and assignment reads", () => {
    const stats = buildWorkerStats({
      applications: [...items(3, "pending"), ...items(1, "rejected")],
      applicationsFull: false,
      active: items(2, "active"),
      activeFull: false,
      completed: items(20, "completed"),
      completedFull: true,
    });
    expect(stats.map((stat) => [stat.label, stat.value])).toEqual([
      ["Applied", "3"],
      ["Shortlisted", "0"],
      ["In progress", "2"],
      ["Completed", "20+"],
    ]);
    // No backend shortlist state exists, so that tile never navigates.
    expect(stats[1].section).toBeNull();
    expect(stats[0].section).toBe("applications");
  });

  it("shows dashes rather than invented numbers before data arrives", () => {
    const stats = buildWorkerStats(null);
    expect(stats.every((stat) => stat.value === "–")).toBe(true);
  });

  it("builds employer tiles from listings, assignments and applicants", () => {
    const stats = buildEmployerStats({
      activePosts: 2,
      applicants: 5,
      applicantsPartial: false,
      active: items(1, "active"),
      activeFull: false,
      completed: [],
      completedFull: false,
    });
    expect(stats.map((stat) => [stat.label, stat.value])).toEqual([
      ["Active posts", "2"],
      ["Applicants", "5"],
      ["In progress", "1"],
      ["Completed", "0"],
    ]);
    expect(stats[0].section).toBe("listings");
  });
});
