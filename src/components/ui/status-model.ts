import type { StatusTone } from "@/theme";

export type Badge = Readonly<{ label: string; tone: StatusTone }>;

/** Product vocabulary for badges. Screens pick from here, never ad-hoc strings. */
export const BADGES = {
  applied: { label: "Applied", tone: "info" },
  // Reserved: the backend has no shortlist state yet (see redesign plan D4).
  shortlisted: { label: "Shortlisted", tone: "info" },
  selected: { label: "Selected", tone: "success" },
  notSelected: { label: "Not selected", tone: "neutral" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
  declined: { label: "Declined", tone: "neutral" },
  proposed: { label: "Awaiting confirmation", tone: "warning" },
  inProgress: { label: "In progress", tone: "info" },
  notStarted: { label: "Not started", tone: "neutral" },
  submitted: { label: "Submitted", tone: "warning" },
  revisionRequested: { label: "Revision requested", tone: "danger" },
  approved: { label: "Approved", tone: "success" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  draft: { label: "Draft", tone: "neutral" },
  open: { label: "Open", tone: "success" },
  assigned: { label: "Worker selected", tone: "info" },
  closed: { label: "Closed", tone: "neutral" },
  urgent: { label: "Urgent", tone: "danger" },
  dueSoon: { label: "Due soon", tone: "warning" },
  overdue: { label: "Overdue", tone: "danger" },
  remote: { label: "Remote", tone: "info" },
  onSite: { label: "On-site", tone: "neutral" },
  hybrid: { label: "Hybrid", tone: "info" },
} as const satisfies Record<string, Badge>;

export function workModeBadge(mode: "onsite" | "remote" | "hybrid"): Badge {
  return mode === "remote"
    ? BADGES.remote
    : mode === "hybrid"
      ? BADGES.hybrid
      : BADGES.onSite;
}

type Domain = "application" | "assignment" | "milestone" | "gig";

const MAP: Record<Domain, Record<string, Badge>> = {
  application: {
    pending: BADGES.applied,
    accepted: BADGES.selected,
    rejected: BADGES.notSelected,
    withdrawn: BADGES.withdrawn,
    declined: BADGES.declined,
  },
  assignment: {
    proposed: BADGES.proposed,
    active: BADGES.inProgress,
    submitted: BADGES.submitted,
    revision_requested: BADGES.revisionRequested,
    completed: BADGES.completed,
    declined: BADGES.declined,
    cancelled: BADGES.cancelled,
  },
  milestone: {
    pending: BADGES.notStarted,
    in_progress: BADGES.inProgress,
    submitted: BADGES.submitted,
    revision_requested: BADGES.revisionRequested,
    approved: BADGES.approved,
    cancelled: BADGES.cancelled,
  },
  gig: {
    draft: BADGES.draft,
    published: BADGES.open,
    assigned: BADGES.assigned,
    in_progress: BADGES.inProgress,
    submitted: BADGES.submitted,
    revision_requested: BADGES.revisionRequested,
    completed: BADGES.completed,
    closed: BADGES.closed,
    cancelled: BADGES.cancelled,
  },
};

function humanize(value: string): string {
  const words = value.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function badgeFor(domain: Domain, status: string): Badge {
  return MAP[domain][status] ?? { label: humanize(status), tone: "neutral" };
}
