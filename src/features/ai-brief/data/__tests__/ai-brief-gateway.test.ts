import {
  createAiBriefGateway,
  DefaultAiBriefGateway,
} from "../ai-brief-gateway";
import type { AiJobBriefProvider } from "../ai-brief-provider";
import {
  AI_SCHEMA_VERSION,
  type JobBriefRequest,
  type JobBriefResponse,
} from "../../model/ai-brief-schemas";

describe("AiBriefGateway", () => {
  const sampleFacts = {
    taskSummary: "Need assistance assembling two ergonomic office desks.",
    category: "errands" as const,
    workMode: "onsite" as const,
    publicArea: "Makati CBD",
    budgetPhp: 1200,
  };

  it("falls back to deterministic provider when no primary provider is supplied", async () => {
    const gateway = createAiBriefGateway();
    const availability = await gateway.checkAvailability();
    expect(availability.isAiAvailable).toBe(false);
    expect(availability.providerId).toBe("deterministic");

    const response = await gateway.generateBrief(sampleFacts);
    expect(response.schemaVersion).toBe(AI_SCHEMA_VERSION);
    expect(response.meta.isFallback).toBe(true);
    expect(response.draft.title.length).toBeGreaterThanOrEqual(5);
  });

  it("uses primary provider when available and healthy", async () => {
    const mockPrimary: AiJobBriefProvider = {
      id: "mock-llm",
      model: "test-model-7b",
      isAvailable: jest.fn(async () => true),
      generateDraft: jest.fn(
        async (req: JobBriefRequest): Promise<JobBriefResponse> => ({
          schemaVersion: AI_SCHEMA_VERSION,
          requestId: req.requestId,
          draft: {
            title: "Office Desk Assembly Specialist",
            description:
              "Expert assembly of ergonomic office desks with precision.",
            category: req.facts.category,
            workMode: req.facts.workMode,
            tasks: [
              {
                description: "Assemble metal frame",
                acceptanceCriterion: "Frame is leveled and stable",
              },
            ],
            skills: ["Carpentry"],
            assumptions: ["Indoor location"],
            safetyNotes: ["Wear safety goggles"],
          },
          meta: {
            provider: "mock-llm",
            model: "test-model-7b",
            promptVersion: "job-brief-v1",
            isFallback: false,
          },
        }),
      ),
    };

    const gateway = new DefaultAiBriefGateway({ primaryProvider: mockPrimary });
    const availability = await gateway.checkAvailability();
    expect(availability.isAiAvailable).toBe(true);
    expect(availability.providerId).toBe("mock-llm");

    const response = await gateway.generateBrief(sampleFacts);
    expect(response.meta.isFallback).toBe(false);
    expect(response.meta.provider).toBe("mock-llm");
    expect(response.draft.title).toBe("Office Desk Assembly Specialist");
  });

  it("safely falls back to deterministic provider if primary provider throws or times out", async () => {
    const failingPrimary: AiJobBriefProvider = {
      id: "failing-llm",
      model: "failing-model",
      isAvailable: jest.fn(async () => true),
      generateDraft: jest.fn(async () => {
        throw new Error("Connection timeout");
      }),
    };

    const gateway = new DefaultAiBriefGateway({
      primaryProvider: failingPrimary,
    });
    const response = await gateway.generateBrief(sampleFacts);

    // Fallback succeeds deterministically
    expect(response.meta.isFallback).toBe(true);
    expect(response.meta.provider).toBe("deterministic");
    expect(response.draft.category).toBe("errands");
  });
});
