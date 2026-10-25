import {
  type AiJobBriefProvider,
  DeterministicTemplateProvider,
} from "./ai-brief-provider";
import {
  JobBriefFactsSchema,
  JobBriefRequestSchema,
  type JobBriefFactsInput,
  type JobBriefResponse,
} from "../model/ai-brief-schemas";

export interface AiBriefGateway {
  checkAvailability(): Promise<{
    isAiAvailable: boolean;
    providerId: string;
    model: string;
  }>;
  generateBrief(facts: JobBriefFactsInput): Promise<JobBriefResponse>;
}

export type AiBriefGatewayOptions = Readonly<{
  primaryProvider?: AiJobBriefProvider;
  fallbackProvider?: AiJobBriefProvider;
}>;

function generateUUID(): string {
  // Use crypto.randomUUID if available, else standard fallback
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class DefaultAiBriefGateway implements AiBriefGateway {
  private readonly primaryProvider?: AiJobBriefProvider;
  private readonly fallbackProvider: AiJobBriefProvider;

  constructor(options?: AiBriefGatewayOptions) {
    this.primaryProvider = options?.primaryProvider;
    this.fallbackProvider =
      options?.fallbackProvider ?? new DeterministicTemplateProvider();
  }

  async checkAvailability(): Promise<{
    isAiAvailable: boolean;
    providerId: string;
    model: string;
  }> {
    if (!this.primaryProvider) {
      return {
        isAiAvailable: false,
        providerId: this.fallbackProvider.id,
        model: this.fallbackProvider.model,
      };
    }

    try {
      const available = await this.primaryProvider.isAvailable();
      if (available) {
        return {
          isAiAvailable: true,
          providerId: this.primaryProvider.id,
          model: this.primaryProvider.model,
        };
      }
    } catch {
      // Primary provider check failed
    }

    return {
      isAiAvailable: false,
      providerId: this.fallbackProvider.id,
      model: this.fallbackProvider.model,
    };
  }

  async generateBrief(facts: JobBriefFactsInput): Promise<JobBriefResponse> {
    const validatedFacts = JobBriefFactsSchema.parse(facts);
    const request = JobBriefRequestSchema.parse({
      requestId: generateUUID(),
      locale: "en-PH",
      facts: validatedFacts,
    });

    if (this.primaryProvider) {
      try {
        const isOnline = await this.primaryProvider.isAvailable();
        if (isOnline) {
          return await this.primaryProvider.generateDraft(request, {
            timeoutMs: 12000,
          });
        }
      } catch {
        // Fall through to deterministic generator upon network error or timeout
      }
    }

    // Deterministic fallback
    return await this.fallbackProvider.generateDraft(request);
  }
}

export function createAiBriefGateway(
  options?: AiBriefGatewayOptions,
): AiBriefGateway {
  return new DefaultAiBriefGateway(options);
}

export const aiBriefGateway: AiBriefGateway = createAiBriefGateway();
