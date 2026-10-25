import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.generated";

import { createSubmissionGateway } from "../submission-gateway";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

describe("submission-gateway", () => {
  const mockSubmissionRow = {
    id: "a0000000-0000-4000-8000-000000000001",
    assignment_id: "a1000000-0000-4000-8000-000000000001",
    milestone_id: null,
    submitted_by: "a2000000-0000-4000-8000-000000000001",
    version: 1,
    note: "All tasks completed.",
    status: "submitted",
    review_note: null,
    submitted_at: "2026-10-25T01:00:00.000Z",
    reviewed_at: null,
    client_request_id: "a3000000-0000-4000-8000-000000000001",
    created_at: "2026-10-25T01:00:00.000Z",
    updated_at: "2026-10-25T01:00:00.000Z",
  };

  it("submits work via submit_assignment_work RPC", async () => {
    const mockRpc = jest.fn(async () => ({
      data: mockSubmissionRow,
      error: null,
    }));
    const mockClient = {
      rpc: mockRpc,
    } as unknown as SupabaseClient<Database>;

    const gateway = createSubmissionGateway(mockClient);
    const result = await gateway.submitAssignmentWork({
      assignmentId: "a1000000-0000-4000-8000-000000000001",
      note: "All tasks completed.",
      clientRequestId: "a3000000-0000-4000-8000-000000000001",
    });

    expect(mockRpc).toHaveBeenCalledWith("submit_assignment_work", {
      p_assignment_id: "a1000000-0000-4000-8000-000000000001",
      p_note: "All tasks completed.",
      p_milestone_id: undefined,
      p_client_request_id: "a3000000-0000-4000-8000-000000000001",
    });
    expect(result.id).toBe("a0000000-0000-4000-8000-000000000001");
    expect(result.version).toBe(1);
    expect(result.status).toBe("submitted");
  });

  it("requests revision via request_submission_revision RPC", async () => {
    const mockRpc = jest.fn(async () => ({
      data: {
        ...mockSubmissionRow,
        status: "revision_requested",
        review_note: "Please re-mount rack 2.",
        reviewed_at: "2026-10-25T02:00:00.000Z",
      },
      error: null,
    }));
    const mockClient = {
      rpc: mockRpc,
    } as unknown as SupabaseClient<Database>;

    const gateway = createSubmissionGateway(mockClient);
    const result = await gateway.requestSubmissionRevision({
      submissionId: "a0000000-0000-4000-8000-000000000001",
      reviewNote: "Please re-mount rack 2.",
    });

    expect(mockRpc).toHaveBeenCalledWith("request_submission_revision", {
      p_submission_id: "a0000000-0000-4000-8000-000000000001",
      p_review_note: "Please re-mount rack 2.",
    });
    expect(result.status).toBe("revision_requested");
    expect(result.reviewNote).toBe("Please re-mount rack 2.");
  });

  it("approves completion via approve_assignment_completion RPC", async () => {
    const mockRpc = jest.fn(async () => ({
      data: {
        ...mockSubmissionRow,
        status: "approved",
        review_note: "Work confirmed and verified.",
        reviewed_at: "2026-10-25T03:00:00.000Z",
      },
      error: null,
    }));
    const mockClient = {
      rpc: mockRpc,
    } as unknown as SupabaseClient<Database>;

    const gateway = createSubmissionGateway(mockClient);
    const result = await gateway.approveAssignmentCompletion({
      submissionId: "a0000000-0000-4000-8000-000000000001",
      reviewNote: "Work confirmed and verified.",
    });

    expect(mockRpc).toHaveBeenCalledWith("approve_assignment_completion", {
      p_submission_id: "a0000000-0000-4000-8000-000000000001",
      p_review_note: "Work confirmed and verified.",
    });
    expect(result.status).toBe("approved");
    expect(result.reviewNote).toBe("Work confirmed and verified.");
  });

  it("lists assignment submissions in order", async () => {
    const mockRpc = jest.fn(async () => ({
      data: [
        { ...mockSubmissionRow, version: 2 },
        { ...mockSubmissionRow, version: 1 },
      ],
      error: null,
    }));
    const mockClient = {
      rpc: mockRpc,
    } as unknown as SupabaseClient<Database>;

    const gateway = createSubmissionGateway(mockClient);
    const list = await gateway.listAssignmentSubmissions(
      "a1000000-0000-4000-8000-000000000001",
    );

    expect(list).toHaveLength(2);
    expect(list[0].version).toBe(2);
    expect(list[1].version).toBe(1);
  });

  it("fetches latest assignment submission", async () => {
    const mockRpc = jest.fn(async () => ({
      data: mockSubmissionRow,
      error: null,
    }));
    const mockClient = {
      rpc: mockRpc,
    } as unknown as SupabaseClient<Database>;

    const gateway = createSubmissionGateway(mockClient);
    const latest = await gateway.getLatestAssignmentSubmission(
      "a1000000-0000-4000-8000-000000000001",
    );

    expect(latest).not.toBeNull();
    expect(latest?.id).toBe("a0000000-0000-4000-8000-000000000001");
  });

  it("propagates RPC errors gracefully", async () => {
    const mockRpc = jest.fn(async () => ({
      data: null,
      error: { message: "Permission denied (P0036)" },
    }));
    const mockClient = {
      rpc: mockRpc,
    } as unknown as SupabaseClient<Database>;

    const gateway = createSubmissionGateway(mockClient);
    await expect(
      gateway.approveAssignmentCompletion({
        submissionId: "a0000000-0000-4000-8000-000000000001",
      }),
    ).rejects.toThrow("Permission denied (P0036)");
  });
});
