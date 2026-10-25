import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { AiJobBriefModal } from "../AiJobBriefModal";
import type { AiBriefGateway } from "../../data/ai-brief-gateway";

describe("AiJobBriefModal", () => {
  const mockOnApply = jest.fn();
  const mockOnClose = jest.fn();

  const mockGateway: AiBriefGateway = {
    checkAvailability: jest.fn(async () => ({
      isAiAvailable: false,
      providerId: "deterministic",
      model: "rule-based-template-v1",
    })),
    generateBrief: jest.fn(async (facts) => ({
      schemaVersion: "1" as const,
      requestId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      draft: {
        title: "Condo Move-in Cleaning",
        description: "Thorough deep clean of 1-bedroom condo unit.",
        category: facts.category,
        workMode: facts.workMode,
        tasks: [
          {
            description: "Scrub bathroom tiles and sanitize fixtures",
            acceptanceCriterion: "Bathroom tiles clean and dry",
          },
        ],
        skills: ["Housekeeping"],
        assumptions: ["Water and power are active"],
        safetyNotes: ["Wear rubber gloves"],
      },
      meta: {
        provider: "deterministic",
        model: "rule-based-template-v1",
        promptVersion: "job-brief-v1",
        isFallback: true,
      },
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders input fields and validates summary length", async () => {
    const view = await render(
      <AiJobBriefModal
        gateway={mockGateway}
        initialCategory="cleaning"
        initialPublicArea="BGC, Taguig"
        initialWorkMode="onsite"
        onApplyDraft={mockOnApply}
        onClose={mockOnClose}
        visible={true}
      />,
    );

    expect(view.getByText("JOB BRIEF BUILDER")).toBeVisible();
    expect(view.getByText("QUICK SPECIFICATION")).toBeVisible();

    // Attempt to generate with empty summary
    const generateBtn = view.getByLabelText("Generate Job Brief");
    await fireEvent.press(generateBtn);

    expect(
      await view.findByText("Task summary must be at least 10 characters."),
    ).toBeVisible();
    expect(mockGateway.generateBrief).not.toHaveBeenCalled();
  });

  it("generates brief and displays provenance banner and draft fields", async () => {
    const view = await render(
      <AiJobBriefModal
        gateway={mockGateway}
        initialCategory="cleaning"
        initialPublicArea="BGC, Taguig"
        initialWorkMode="onsite"
        onApplyDraft={mockOnApply}
        onClose={mockOnClose}
        visible={true}
      />,
    );

    const summaryInput = view.getByLabelText("Task Summary");
    await fireEvent.changeText(
      summaryInput,
      "Need full move-in cleaning for studio unit before Friday.",
    );

    const generateBtn = view.getByLabelText("Generate Job Brief");
    await fireEvent.press(generateBtn);

    await waitFor(() => {
      expect(mockGateway.generateBrief).toHaveBeenCalledTimes(1);
    });

    expect(await view.findByText("MANUAL TEMPLATE DRAFT")).toBeVisible();
    expect(view.getByLabelText("Draft Title")).toHaveProp(
      "value",
      "Condo Move-in Cleaning",
    );

    // Apply draft to form
    const applyBtn = view.getByLabelText("Apply Draft to Form");
    await fireEvent.press(applyBtn);

    expect(mockOnApply).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Condo Move-in Cleaning",
        category: "cleaning",
      }),
      "BGC, Taguig",
    );
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
