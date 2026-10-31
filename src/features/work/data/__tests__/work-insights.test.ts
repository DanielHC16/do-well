import type { MilestoneRecord } from "@/features/assignments/model/assignment-schemas";
import type { CacheStore } from "@/shared/persistence/cache-store";

import { createCachedWorkReader } from "../work-cache";
import { milestoneProgress, weekMilestoneSummary } from "../work-insights";
import type { WorkItem } from "../work-gateway";

function milestone(
  status: MilestoneRecord["status"],
  dueAt: string | null = null,
): MilestoneRecord {
  return {
    id: `00000000-0000-4000-8000-${Math.random().toString().slice(2, 14).padEnd(12, "0")}`,
    assignmentId: "00000000-0000-4000-8000-000000000001",
    position: 1,
    title: "Step",
    description: null,
    dueAt,
    status,
    approvedAt: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  };
}

const item: WorkItem = {
  id: "11111111-1111-4111-8111-111111111111",
  gigId: "22222222-2222-4222-8222-222222222222",
  title: "Sort files",
  status: "active",
  amount: 500,
  dueAt: null,
  kind: "assignment",
};

describe("milestone progress", () => {
  it("is approved milestones over all non-cancelled milestones", () => {
    const progress = milestoneProgress(
      [milestone("approved"), milestone("submitted"), milestone("cancelled")],
      "active",
    );
    expect(progress).toEqual({
      value: 0.5,
      label: "1 of 2 milestones approved",
    });
  });

  it("is complete for completed work and unknown without milestones", () => {
    expect(milestoneProgress([], "completed")?.value).toBe(1);
    expect(milestoneProgress([], "active")).toBeNull();
  });
});

describe("this week's milestones", () => {
  const now = new Date(2026, 9, 28, 12); // Wednesday
  it("counts only milestones due Monday–Sunday of the current week", () => {
    const summary = weekMilestoneSummary(
      [
        milestone("approved", new Date(2026, 9, 26, 9).toISOString()),
        milestone("submitted", new Date(2026, 9, 30, 9).toISOString()),
        milestone("in_progress", new Date(2026, 10, 1, 9).toISOString()),
        milestone("pending", new Date(2026, 10, 3, 9).toISOString()),
        milestone("pending", null),
      ],
      now,
    );
    expect(summary).toEqual({ total: 3, approved: 1, toReview: 1 });
  });
});

describe("cached work reader", () => {
  function memoryCache(): CacheStore {
    const store = new Map<string, { data: unknown; cachedAt: string }>();
    return {
      get: jest.fn(async (user: string, key: string) => {
        const hit = store.get(`${user}/${key}`);
        return hit
          ? {
              ...hit,
              userId: user,
              key,
              version: 1,
              byteSize: 1,
            }
          : null;
      }) as CacheStore["get"],
      set: jest.fn(async (user: string, key: string, data: unknown) => {
        store.set(`${user}/${key}`, {
          data,
          cachedAt: "2026-10-31T07:34:00.000Z",
        });
        return {
          data,
          cachedAt: "2026-10-31T07:34:00.000Z",
          userId: user,
          key,
          version: 1,
          byteSize: 1,
        };
      }) as CacheStore["set"],
      remove: jest.fn(),
      purgeUser: jest.fn(),
      clearAll: jest.fn(),
    };
  }

  it("serves the saved first page only when the network is unreachable", async () => {
    const cache = memoryCache();
    const list = jest
      .fn()
      .mockResolvedValueOnce([item])
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockRejectedValueOnce({ message: "permission denied", code: "42501" });
    const reader = createCachedWorkReader({ list }, cache);

    expect(await reader("user", "worker", "active", 0)).toEqual({
      items: [item],
      cachedAt: null,
    });
    expect(await reader("user", "worker", "active", 0)).toEqual({
      items: [item],
      cachedAt: "2026-10-31T07:34:00.000Z",
    });
    // Authorization failures never fall back to a saved snapshot.
    await expect(reader("user", "worker", "active", 0)).rejects.toMatchObject({
      kind: "unauthorized",
    });
  });

  it("rejects malformed snapshots instead of rendering them", async () => {
    const cache = memoryCache();
    await cache.set("user", "work:worker:active", [{ bogus: true }]);
    const reader = createCachedWorkReader(
      {
        list: jest
          .fn()
          .mockRejectedValue(new TypeError("Network request failed")),
      },
      cache,
    );
    await expect(reader("user", "worker", "active", 0)).rejects.toMatchObject({
      kind: "offline",
    });
  });
});
