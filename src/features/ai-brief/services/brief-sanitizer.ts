import {
  JobBriefDraftSchema,
  type JobBriefDraft,
  type JobBriefFacts,
  type JobBriefFactsInput,
} from "../model/ai-brief-schemas";

const HTML_TAG_REGEX = /<[^>]*>/gi;
const SCRIPT_INJECTION_REGEX = /javascript\s*:/gi;
const SQL_DANGEROUS_REGEX =
  /\b(DROP\s+TABLE|ALTER\s+TABLE|TRUNCATE\s+TABLE|UNION\s+SELECT)\b/gi;
const PROMPT_INJECTION_ESCAPE_REGEX =
  /(system\s+override|ignore\s+all\s+(previous\s+)?instructions|reveal\s+(system\s+)?prompt)/gi;

export function sanitizePlainText(text: string): string {
  if (!text) return "";
  return text
    .replace(HTML_TAG_REGEX, "")
    .replace(SCRIPT_INJECTION_REGEX, "")
    .replace(SQL_DANGEROUS_REGEX, "[blocked-query]")
    .replace(PROMPT_INJECTION_ESCAPE_REGEX, "[blocked-instruction]")
    .trim();
}

export type SanitationResult = {
  readonly success: boolean;
  readonly sanitizedDraft?: JobBriefDraft;
  readonly reason?: string;
};

export function sanitizeAndValidateDraft(
  rawDraft: unknown,
  facts: JobBriefFacts | JobBriefFactsInput,
): SanitationResult {
  if (!rawDraft || typeof rawDraft !== "object") {
    return { success: false, reason: "Draft is not an object." };
  }

  const candidate = rawDraft as Record<string, unknown>;

  // Enforce authoritative facts: category and workMode MUST match inputs exactly
  candidate.category = facts.category;
  candidate.workMode = facts.workMode;

  // Sanitize text fields
  if (typeof candidate.title === "string") {
    candidate.title = sanitizePlainText(candidate.title);
  }
  if (typeof candidate.description === "string") {
    candidate.description = sanitizePlainText(candidate.description);
  }

  if (Array.isArray(candidate.tasks)) {
    candidate.tasks = candidate.tasks.map((taskItem) => {
      if (taskItem && typeof taskItem === "object") {
        const item = taskItem as Record<string, unknown>;
        return {
          description:
            typeof item.description === "string"
              ? sanitizePlainText(item.description)
              : "Execute task",
          acceptanceCriterion:
            typeof item.acceptanceCriterion === "string"
              ? sanitizePlainText(item.acceptanceCriterion)
              : "Completed to standard",
        };
      }
      return {
        description: "Execute task",
        acceptanceCriterion: "Completed to standard",
      };
    });
  }

  if (Array.isArray(candidate.skills)) {
    candidate.skills = candidate.skills
      .filter((s): s is string => typeof s === "string")
      .map(sanitizePlainText)
      .filter((s) => s.length > 0);
  }

  if (Array.isArray(candidate.assumptions)) {
    candidate.assumptions = candidate.assumptions
      .filter((a): a is string => typeof a === "string")
      .map(sanitizePlainText)
      .filter((a) => a.length > 0);
  }

  if (Array.isArray(candidate.safetyNotes)) {
    candidate.safetyNotes = candidate.safetyNotes
      .filter((n): n is string => typeof n === "string")
      .map(sanitizePlainText)
      .filter((n) => n.length > 0);
  }

  const parseResult = JobBriefDraftSchema.safeParse(candidate);
  if (!parseResult.success) {
    return {
      success: false,
      reason: parseResult.error.issues.map((i) => i.message).join("; "),
    };
  }

  return {
    success: true,
    sanitizedDraft: parseResult.data,
  };
}
