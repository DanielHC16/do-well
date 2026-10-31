import { useEffect, useState } from "react";

import type { AssignmentGateway } from "@/features/assignments/data/assignment-gateway";
import type { MilestoneRecord } from "@/features/assignments/model/assignment-schemas";
import type { ShellMode } from "@/features/shell/model/shell-mode";

export type Progress = Readonly<{ value: number; label: string }>;

/** Approved / non-cancelled milestones; completed work is always 100%. */
export function milestoneProgress(
  milestones: readonly MilestoneRecord[],
  assignmentStatus: string,
): Progress | null {
  const counted = milestones.filter((step) => step.status !== "cancelled");
  if (assignmentStatus === "completed")
    return { value: 1, label: "Work approved and completed" };
  if (counted.length === 0) return null;
  const approved = counted.filter((step) => step.status === "approved").length;
  return {
    value: approved / counted.length,
    label: `${approved} of ${counted.length} milestones approved`,
  };
}

function weekBounds(now: Date): [number, number] {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return [start.getTime(), end.getTime()];
}

export type WeekSummary = Readonly<{
  total: number;
  approved: number;
  toReview: number;
}>;

/** Milestones due Monday–Sunday of `now`'s week. */
export function weekMilestoneSummary(
  milestones: readonly MilestoneRecord[],
  now: Date = new Date(),
): WeekSummary {
  const [start, end] = weekBounds(now);
  const thisWeek = milestones.filter((step) => {
    if (!step.dueAt || step.status === "cancelled") return false;
    const due = new Date(step.dueAt).getTime();
    return due >= start && due < end;
  });
  return {
    total: thisWeek.length,
    approved: thisWeek.filter((step) => step.status === "approved").length,
    toReview: thisWeek.filter((step) => step.status === "submitted").length,
  };
}

export type InsightSource = Pick<
  AssignmentGateway,
  "listMilestones" | "getAssignmentDetail"
>;

export type AssignmentInsight = Readonly<{
  milestones: MilestoneRecord[];
  /** The other participant (employer for workers, worker for employers). */
  counterpart: string | null;
}>;

const TTL_MS = 60_000;
const cache = new Map<
  string,
  Readonly<{ at: number; value: Promise<AssignmentInsight> }>
>();

async function defaultSource(): Promise<InsightSource> {
  const module = await import("@/features/assignments/data/assignment-gateway");
  return module.assignmentGateway;
}

/** Existing participant-scoped reads; cached briefly and shared across cards. */
export function loadAssignmentInsight(
  assignmentId: string,
  mode: ShellMode,
  userId: string,
  source?: InsightSource,
): Promise<AssignmentInsight> {
  const key = `${userId}:${mode}:${assignmentId}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = (source ? Promise.resolve(source) : defaultSource()).then(
    async (gateway) => {
      const [milestones, detail] = await Promise.all([
        gateway.listMilestones(assignmentId),
        gateway.getAssignmentDetail(assignmentId, userId).catch(() => null),
      ]);
      const other = mode === "worker" ? detail?.employer : detail?.worker;
      return { milestones, counterpart: other?.displayName ?? null };
    },
  );
  cache.set(key, { at: Date.now(), value });
  value.catch(() => cache.delete(key));
  return value;
}

export function clearAssignmentInsights(): void {
  cache.clear();
}

/** Per-card lazy enrichment; FlatList virtualization keeps requests bounded. */
export function useAssignmentInsight(
  assignmentId: string | null,
  mode: ShellMode,
  userId: string,
  refreshKey: number,
  source?: InsightSource,
): AssignmentInsight | null {
  const [insight, setInsight] = useState<AssignmentInsight | null>(null);
  useEffect(() => {
    if (!assignmentId) return;
    let active = true;
    void loadAssignmentInsight(assignmentId, mode, userId, source)
      .then((value) => {
        if (active) setInsight(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [assignmentId, mode, userId, refreshKey, source]);
  return insight;
}
