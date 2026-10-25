import {
  AI_PROMPT_VERSION,
  AI_SCHEMA_VERSION,
  type JobBriefDraft,
  type JobBriefRequest,
  type JobBriefResponse,
} from "../model/ai-brief-schemas";
import { sanitizeAndValidateDraft } from "../services/brief-sanitizer";
import { generateDeterministicBrief } from "../services/deterministic-brief-generator";

export interface AiJobBriefProvider {
  readonly id: string;
  readonly model: string;
  isAvailable(): Promise<boolean>;
  generateDraft(
    request: JobBriefRequest,
    options?: { signal?: AbortSignal; timeoutMs?: number },
  ): Promise<JobBriefResponse>;
}

export class DeterministicTemplateProvider implements AiJobBriefProvider {
  readonly id = "deterministic";
  readonly model = "rule-based-template-v1";

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async generateDraft(request: JobBriefRequest): Promise<JobBriefResponse> {
    const draft: JobBriefDraft = generateDeterministicBrief(request.facts);
    return {
      schemaVersion: AI_SCHEMA_VERSION,
      requestId: request.requestId,
      draft,
      meta: {
        provider: this.id,
        model: this.model,
        promptVersion: AI_PROMPT_VERSION,
        isFallback: true,
      },
    };
  }
}

export type LocalGatewayConfig = Readonly<{
  endpointUrl: string;
  pairingToken?: string;
  timeoutMs?: number;
}>;

export class LocalGatewayAiProvider implements AiJobBriefProvider {
  readonly id = "local-ollama-lan";
  readonly model = "qwen3:1.7b";
  private readonly config: LocalGatewayConfig;

  constructor(config: LocalGatewayConfig) {
    this.config = config;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.endpointUrl) return false;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.config.endpointUrl}/health`, {
        signal: controller.signal,
        headers: this.config.pairingToken
          ? { Authorization: `Bearer ${this.config.pairingToken}` }
          : {},
      });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }

  async generateDraft(
    request: JobBriefRequest,
    options?: { signal?: AbortSignal; timeoutMs?: number },
  ): Promise<JobBriefResponse> {
    const timeout = options?.timeoutMs ?? this.config.timeoutMs ?? 12000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.config.endpointUrl}/v1/job-brief`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.pairingToken
            ? { Authorization: `Bearer ${this.config.pairingToken}` }
            : {}),
        },
        body: JSON.stringify(request),
        signal: options?.signal ?? controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Local gateway returned HTTP ${response.status}`);
      }

      const json = await response.json();
      const rawDraft = json?.draft ?? json;

      const sanitationResult = sanitizeAndValidateDraft(
        rawDraft,
        request.facts,
      );
      if (!sanitationResult.success || !sanitationResult.sanitizedDraft) {
        throw new Error(
          sanitationResult.reason ?? "Model output failed schema validation",
        );
      }

      return {
        schemaVersion: AI_SCHEMA_VERSION,
        requestId: request.requestId,
        draft: sanitationResult.sanitizedDraft,
        meta: {
          provider: this.id,
          model: this.model,
          promptVersion: AI_PROMPT_VERSION,
          isFallback: false,
        },
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
