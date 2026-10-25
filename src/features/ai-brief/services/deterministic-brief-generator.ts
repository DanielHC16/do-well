import {
  GIG_CATEGORY_LABELS,
  type GigCategory,
} from "@/features/gigs/model/gig-schemas";

import {
  JobBriefDraftSchema,
  type JobBriefDraft,
  type JobBriefFacts,
  type JobBriefFactsInput,
  type JobBriefTaskItem,
} from "../model/ai-brief-schemas";

const DEFAULT_CATEGORY_TASKS: Record<GigCategory, JobBriefTaskItem[]> = {
  errands: [
    {
      description: "Confirm task requirements and destination with employer",
      acceptanceCriterion:
        "Requirements verified and destination details acknowledged",
    },
    {
      description: "Execute errand promptly according to provided schedule",
      acceptanceCriterion:
        "Errand completed with item handoff or proof of errand accomplishment",
    },
  ],
  delivery: [
    {
      description: "Collect packages carefully from sender location",
      acceptanceCriterion:
        "All items checked for packaging integrity before transit",
    },
    {
      description: "Deliver packages safely to destination recipient",
      acceptanceCriterion:
        "Recipient photo proof or acknowledgment signed upon delivery",
    },
  ],
  cleaning: [
    {
      description: "Perform initial walkthrough and prepare cleaning supplies",
      acceptanceCriterion:
        "Supplies organized and focus areas identified with employer",
    },
    {
      description: "Clean, scrub, and sanitize agreed surfaces thoroughly",
      acceptanceCriterion:
        "Surfaces free of dust, grime, and debris upon inspection",
    },
    {
      description: "Dispose of trash properly and return items to order",
      acceptanceCriterion:
        "Trash placed in designated bins and workspace left neat",
    },
  ],
  events: [
    {
      description: "Check in with event coordinator and review role duties",
      acceptanceCriterion: "On-time arrival and assignment briefing completed",
    },
    {
      description: "Assist with event setup, guest guidance, or coordination",
      acceptanceCriterion:
        "Station handled professionally throughout active event hours",
    },
    {
      description: "Assist with post-event pack up and inventory count",
      acceptanceCriterion: "Materials safely packed and coordinator signs off",
    },
  ],
  admin: [
    {
      description: "Review source documents, spreadsheets, or input files",
      acceptanceCriterion: "Files verified and format requirements clarified",
    },
    {
      description: "Process, organize, or enter records accurately",
      acceptanceCriterion:
        "All entries cross-checked with zero missing mandatory fields",
    },
  ],
  tutoring: [
    {
      description: "Assess student learning goals and current topic grasp",
      acceptanceCriterion: "Initial assessment done and session focus agreed",
    },
    {
      description:
        "Guide student through concept explanations and practice problems",
      acceptanceCriterion:
        "Practice exercises completed with constructive feedback given",
    },
  ],
  digital: [
    {
      description: "Review digital project brief and creative/technical assets",
      acceptanceCriterion:
        "Asset completeness confirmed and questions resolved early",
    },
    {
      description:
        "Execute digital deliverables according to technical specifications",
      acceptanceCriterion:
        "Files delivered in specified formats ready for employer review",
    },
  ],
  other: [
    {
      description: "Confirm detailed work scope and expectations with employer",
      acceptanceCriterion: "Scope and schedule aligned prior to starting work",
    },
    {
      description: "Execute agreed tasks with regular status updates",
      acceptanceCriterion:
        "Work completed to employer satisfaction and signed off",
    },
  ],
};

const DEFAULT_CATEGORY_SAFETY: Record<GigCategory, string[]> = {
  errands: [
    "Practice caution while commuting and observe traffic rules.",
    "Do not handle hazardous, prohibited, or unmarked substances.",
  ],
  delivery: [
    "Secure items properly during transit to prevent physical damage.",
    "Wear appropriate footwear and maintain personal safety during transit.",
  ],
  cleaning: [
    "Ensure proper room ventilation when utilizing cleaning agents.",
    "Wear rubber gloves and avoid mixing chemical solutions.",
  ],
  events: [
    "Wear comfortable, slip-resistant footwear for prolonged standing.",
    "Stay hydrated and report any venue safety hazards to the coordinator.",
  ],
  admin: [
    "Maintain confidentiality of all client data and credentials.",
    "Take ergonomic breaks during extended computer use.",
  ],
  tutoring: [
    "Conduct sessions in professional, well-lit spaces or approved video links.",
    "Maintain respectful and professional educator boundaries at all times.",
  ],
  digital: [
    "Keep client source files secure and retain local backups.",
    "Do not publish or share proprietary project data externally.",
  ],
  other: [
    "Clarify any physical safety hazards before commencing work.",
    "Stop and communicate immediately if conditions become unsafe.",
  ],
};

function formatTitle(summary: string, category: GigCategory): string {
  const cleanSummary = summary.replace(/\r?\n+/g, " ").trim();
  const firstSentence = cleanSummary.split(/[.!?]/)[0]?.trim() ?? cleanSummary;
  const categoryLabel = GIG_CATEGORY_LABELS[category];

  if (firstSentence.length >= 10 && firstSentence.length <= 60) {
    const formatted =
      firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1);
    return formatted.endsWith(".") ? formatted.slice(0, -1) : formatted;
  }

  const words = firstSentence.split(/\s+/).slice(0, 7).join(" ");
  if (words.length >= 5 && words.length <= 80) {
    return `${words} (${categoryLabel})`;
  }

  return `${categoryLabel} Assistance`;
}

export function generateDeterministicBrief(
  facts: JobBriefFacts | JobBriefFactsInput,
): JobBriefDraft {
  const title = formatTitle(facts.taskSummary, facts.category);

  const cleanSummary = facts.taskSummary.replace(/\r?\n+/g, " ").trim();
  const categoryLabel = GIG_CATEGORY_LABELS[facts.category];

  let description = `${cleanSummary} `;
  if (facts.workMode === "remote") {
    description += `This is a remote engagement. Deliverables must be submitted digitally via the platform.`;
  } else {
    description += `This task will take place onsite in ${facts.publicArea}. Worker should arrive prepared and on schedule.`;
  }

  if (facts.constraints && facts.constraints.length > 0) {
    description += ` Note constraints: ${facts.constraints.join("; ")}.`;
  }

  if (description.length < 20) {
    description += ` Category: ${categoryLabel}. All milestone requirements must be adhered to.`;
  }

  let tasks: JobBriefTaskItem[] = [];
  if (facts.tasks && facts.tasks.length > 0) {
    tasks = facts.tasks.slice(0, 10).map((t, index) => ({
      description: t.length >= 5 ? t : `${t} (Step ${index + 1})`,
      acceptanceCriterion: `Completed satisfactorily: ${t.slice(0, 80)}`,
    }));
  } else {
    tasks =
      DEFAULT_CATEGORY_TASKS[facts.category] ?? DEFAULT_CATEGORY_TASKS.other;
  }

  const skills =
    facts.skills && facts.skills.length > 0
      ? facts.skills.slice(0, 10)
      : [`${categoryLabel} competence`, "Reliability", "Clear communication"];

  const assumptions = [
    facts.workMode === "remote"
      ? "Worker has stable internet connection and necessary digital tools"
      : "Employer or site contact will be available during agreed arrival",
    "Requirements and timeline are agreed upon before work begins",
  ].slice(0, 5);

  const safetyNotes =
    DEFAULT_CATEGORY_SAFETY[facts.category] ?? DEFAULT_CATEGORY_SAFETY.other;

  const rawDraft = {
    title: title.slice(0, 100),
    description: description.slice(0, 2000),
    category: facts.category,
    workMode: facts.workMode,
    tasks,
    skills,
    assumptions,
    safetyNotes,
  };

  return JobBriefDraftSchema.parse(rawDraft);
}
