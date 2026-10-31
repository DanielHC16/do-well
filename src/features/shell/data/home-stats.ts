import { useEffect, useState } from "react";

import type { ApplicationGateway } from "@/features/applications/data/application-gateway";
import type { GigRecord } from "@/features/gigs/model/gig-schemas";
import type { ShellMode } from "@/features/shell/model/shell-mode";
import type {
  WorkGateway,
  WorkItem,
  WorkSection,
} from "@/features/work/data/work-gateway";

export type HomeStat = Readonly<{
  key: string;
  label: string;
  /** Pre-formatted: "3", "20+" (page cap), or "–" while unknown. */
  value: string;
  /** My Work section a tap opens; null when the tile is informational. */
  section: WorkSection | null;
}>;

// Bounds the per-gig applicant reads so a large employer never fans out widely.
const MAX_APPLICANT_GIGS = 10;

export function countLabel(count: number | null, capped: boolean): string {
  if (count === null) return "–";
  return capped ? `${count}+` : String(count);
}

type WorkerCounts = Readonly<{
  applications: readonly WorkItem[];
  applicationsFull: boolean;
  active: readonly WorkItem[];
  activeFull: boolean;
  completed: readonly WorkItem[];
  completedFull: boolean;
}>;

export function buildWorkerStats(counts: WorkerCounts | null): HomeStat[] {
  const pending = counts
    ? counts.applications.filter((item) => item.status === "pending").length
    : null;
  return [
    {
      key: "applied",
      label: "Applied",
      value: countLabel(pending, counts?.applicationsFull ?? false),
      section: "applications",
    },
    {
      // The backend has no shortlist state; this is a true zero, not a guess.
      key: "shortlisted",
      label: "Shortlisted",
      value: counts ? "0" : "–",
      section: null,
    },
    {
      key: "inProgress",
      label: "In progress",
      value: countLabel(
        counts?.active.length ?? null,
        counts?.activeFull ?? false,
      ),
      section: "active",
    },
    {
      key: "completed",
      label: "Completed",
      value: countLabel(
        counts?.completed.length ?? null,
        counts?.completedFull ?? false,
      ),
      section: "completed",
    },
  ];
}

type EmployerCounts = Readonly<{
  activePosts: number;
  applicants: number;
  applicantsPartial: boolean;
  active: readonly WorkItem[];
  activeFull: boolean;
  completed: readonly WorkItem[];
  completedFull: boolean;
}>;

export function buildEmployerStats(counts: EmployerCounts | null): HomeStat[] {
  return [
    {
      key: "activePosts",
      label: "Active posts",
      value: countLabel(counts?.activePosts ?? null, false),
      section: "listings",
    },
    {
      key: "applicants",
      label: "Applicants",
      value: countLabel(
        counts?.applicants ?? null,
        counts?.applicantsPartial ?? false,
      ),
      section: "listings",
    },
    {
      key: "inProgress",
      label: "In progress",
      value: countLabel(
        counts?.active.length ?? null,
        counts?.activeFull ?? false,
      ),
      section: "active",
    },
    {
      key: "completed",
      label: "Completed",
      value: countLabel(
        counts?.completed.length ?? null,
        counts?.completedFull ?? false,
      ),
      section: "completed",
    },
  ];
}

export type HomeStatsSources = Readonly<{
  work: Pick<WorkGateway, "list">;
  applicants: Pick<ApplicationGateway, "listGigApplicants">;
  /** Rows per work page; a full page means "or more". */
  pageSize: number;
}>;

async function loadDefaultSources(): Promise<HomeStatsSources> {
  // Lazy so rendering Home's header never pulls the Supabase client into
  // module scope (keeps unit tests and cold start light).
  const [work, applications] = await Promise.all([
    import("@/features/work/data/work-gateway"),
    import("@/features/applications/data/application-gateway"),
  ]);
  return {
    work: work.workGateway,
    applicants: applications.applicationGateway,
    pageSize: work.WORK_PAGE_SIZE,
  };
}

/**
 * Real header counts from existing RLS-scoped reads. Unknown values render
 * "–"; a failed read keeps dashes rather than showing a misleading zero.
 */
export function useHomeStats(
  userId: string,
  mode: ShellMode,
  employerGigs: readonly GigRecord[] | null,
  refreshKey: number,
  sources?: HomeStatsSources,
): HomeStat[] {
  const [stats, setStats] = useState<HomeStat[]>(() =>
    mode === "worker" ? buildWorkerStats(null) : buildEmployerStats(null),
  );

  useEffect(() => {
    let active = true;
    const load = async (): Promise<HomeStat[]> => {
      const { work, applicants, pageSize } =
        sources ?? (await loadDefaultSources());
      const full = (list: readonly unknown[]) => list.length >= pageSize;
      if (mode === "worker") {
        const [applications, inProgress, completed] = await Promise.all([
          work.list(userId, "worker", "applications"),
          work.list(userId, "worker", "active"),
          work.list(userId, "worker", "completed"),
        ]);
        return buildWorkerStats({
          applications,
          applicationsFull: full(applications),
          active: inProgress,
          activeFull: full(inProgress),
          completed,
          completedFull: full(completed),
        });
      }
      if (!employerGigs) return buildEmployerStats(null);
      const published = employerGigs.filter(
        (gig) => gig.status === "published",
      );
      const sampled = published.slice(0, MAX_APPLICANT_GIGS);
      const [inProgress, completed, applicantLists] = await Promise.all([
        work.list(userId, "employer", "active"),
        work.list(userId, "employer", "completed"),
        Promise.all(sampled.map((gig) => applicants.listGigApplicants(gig.id))),
      ]);
      return buildEmployerStats({
        activePosts: published.length,
        applicants: applicantLists
          .flat()
          .filter((applicant) => applicant.status === "pending").length,
        applicantsPartial: published.length > sampled.length,
        active: inProgress,
        activeFull: full(inProgress),
        completed,
        completedFull: full(completed),
      });
    };
    void load()
      .then((next) => {
        if (active) setStats(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [userId, mode, employerGigs, refreshKey, sources]);

  return stats;
}

export type WorkCount = Readonly<{ key: string; label: string; value: string }>;

const COUNT_SECTIONS: Record<
  ShellMode,
  readonly Readonly<{ section: WorkSection; label: string }>[]
> = {
  worker: [
    { section: "applications", label: "Applications" },
    { section: "active", label: "Active" },
    { section: "completed", label: "Completed" },
  ],
  employer: [
    { section: "listings", label: "Posted" },
    { section: "active", label: "In progress" },
    { section: "completed", label: "Completed" },
  ],
};

/** Profile stats row: one existing first-page read per section ("20+" at the cap). */
export function useWorkCounts(
  userId: string,
  mode: ShellMode,
  refreshKey: number,
  sources?: HomeStatsSources,
): WorkCount[] {
  const sections = COUNT_SECTIONS[mode];
  const [counts, setCounts] = useState<(number | null)[]>(() =>
    sections.map(() => null),
  );
  const [pageSize, setPageSize] = useState(Number.POSITIVE_INFINITY);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { work, pageSize: size } = sources ?? (await loadDefaultSources());
      const lists = await Promise.all(
        COUNT_SECTIONS[mode].map(({ section }) =>
          work.list(userId, mode, section),
        ),
      );
      if (!active) return;
      setPageSize(size);
      setCounts(lists.map((list) => list.length));
    })().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [userId, mode, refreshKey, sources]);

  return sections.map(({ section, label }, index) => {
    const count = counts[index] ?? null;
    return {
      key: section,
      label,
      value: countLabel(count, count !== null && count >= pageSize),
    };
  });
}
