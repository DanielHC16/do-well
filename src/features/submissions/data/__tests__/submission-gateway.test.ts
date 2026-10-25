import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.generated";

import { createSubmissionGateway } from "../submission-gateway";

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "a3000000-0000-4000-8000-000000000099"),
}));

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

  const mockFileRow = {
    id: "f0000000-0000-4000-8000-000000000001",
    submission_id: "a0000000-0000-4000-8000-000000000001",
    uploader_id: "a2000000-0000-4000-8000-000000000001",
    object_path: "user/asgn/sub/pic.jpg",
    media_type: "image/jpeg",
    size_bytes: 1048576,
    created_at: "2026-10-25T01:05:00.000Z",
    updated_at: "2026-10-25T01:05:00.000Z",
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

  it("begins submission via begin_submission RPC", async () => {
    const mockRpc = jest.fn(async () => ({
      data: {
        ...mockSubmissionRow,
        status: "pending_upload",
        submitted_at: null,
      },
      error: null,
    }));
    const mockClient = {
      rpc: mockRpc,
    } as unknown as SupabaseClient<Database>;

    const gateway = createSubmissionGateway(mockClient);
    const result = await gateway.beginSubmission({
      assignmentId: "a1000000-0000-4000-8000-000000000001",
      note: "Staging evidence",
      clientRequestId: "a3000000-0000-4000-8000-000000000001",
    });

    expect(mockRpc).toHaveBeenCalledWith("begin_submission", {
      p_assignment_id: "a1000000-0000-4000-8000-000000000001",
      p_note: "Staging evidence",
      p_milestone_id: undefined,
      p_client_request_id: "a3000000-0000-4000-8000-000000000001",
    });
    expect(result.status).toBe("pending_upload");
  });

  it("generates a unique native-safe idempotency key when none is supplied", async () => {
    const mockRpc = jest.fn(async () => ({
      data: {
        ...mockSubmissionRow,
        status: "pending_upload",
        submitted_at: null,
      },
      error: null,
    }));
    const gateway = createSubmissionGateway({
      rpc: mockRpc,
    } as unknown as SupabaseClient<Database>);

    await gateway.beginSubmission({
      assignmentId: "a1000000-0000-4000-8000-000000000001",
    });

    expect(mockRpc).toHaveBeenCalledWith("begin_submission", {
      p_assignment_id: "a1000000-0000-4000-8000-000000000001",
      p_client_request_id: "a3000000-0000-4000-8000-000000000099",
      p_milestone_id: undefined,
      p_note: undefined,
    });
  });

  it("finalizes submission via finalize_submission RPC", async () => {
    const mockRpc = jest.fn(async () => ({
      data: mockSubmissionRow,
      error: null,
    }));
    const mockClient = {
      rpc: mockRpc,
    } as unknown as SupabaseClient<Database>;

    const gateway = createSubmissionGateway(mockClient);
    const result = await gateway.finalizeSubmission({
      submissionId: "a0000000-0000-4000-8000-000000000001",
      files: [
        {
          object_path: "u/a/s/pic.jpg",
          media_type: "image/jpeg",
          size_bytes: 1048576,
        },
      ],
    });

    expect(mockRpc).toHaveBeenCalledWith("finalize_submission", {
      p_submission_id: "a0000000-0000-4000-8000-000000000001",
      p_files: [
        {
          object_path: "u/a/s/pic.jpg",
          media_type: "image/jpeg",
          size_bytes: 1048576,
        },
      ],
    });
    expect(result.status).toBe("submitted");
  });

  it("lists submission files via list_submission_files RPC", async () => {
    const mockRpc = jest.fn(async () => ({
      data: [mockFileRow],
      error: null,
    }));
    const mockClient = {
      rpc: mockRpc,
    } as unknown as SupabaseClient<Database>;

    const gateway = createSubmissionGateway(mockClient);
    const files = await gateway.listSubmissionFiles(
      "a0000000-0000-4000-8000-000000000001",
    );

    expect(mockRpc).toHaveBeenCalledWith("list_submission_files", {
      p_submission_id: "a0000000-0000-4000-8000-000000000001",
    });
    expect(files).toHaveLength(1);
    expect(files[0].mediaType).toBe("image/jpeg");
    expect(files[0].sizeBytes).toBe(1048576);
  });

  it("creates evidence signed url via storage client", async () => {
    const mockCreateSignedUrl = jest.fn(async () => ({
      data: { signedUrl: "https://storage.example.com/signed?token=abc" },
      error: null,
    }));
    const mockClient = {
      storage: {
        from: jest.fn(() => ({
          createSignedUrl: mockCreateSignedUrl,
        })),
      },
    } as unknown as SupabaseClient<Database>;

    const gateway = createSubmissionGateway(mockClient);
    const url = await gateway.createEvidenceSignedUrl("user/asgn/sub/pic.jpg");

    expect(mockClient.storage.from).toHaveBeenCalledWith("submission-evidence");
    expect(mockCreateSignedUrl).toHaveBeenCalledWith(
      "user/asgn/sub/pic.jpg",
      3600,
    );
    expect(url).toBe("https://storage.example.com/signed?token=abc");
  });

  it("uploads evidence blob via storage client", async () => {
    const mockUpload = jest.fn(async () => ({
      data: { path: "user/asgn/sub/pic.jpg" },
      error: null,
    }));
    const mockClient = {
      storage: {
        from: jest.fn(() => ({
          upload: mockUpload,
        })),
      },
    } as unknown as SupabaseClient<Database>;

    const gateway = createSubmissionGateway(mockClient);
    const path = await gateway.uploadEvidenceBlob(
      "user/asgn/sub/pic.jpg",
      new ArrayBuffer(10),
      "image/jpeg",
    );

    expect(mockClient.storage.from).toHaveBeenCalledWith("submission-evidence");
    expect(mockUpload).toHaveBeenCalledWith(
      "user/asgn/sub/pic.jpg",
      expect.any(ArrayBuffer),
      {
        contentType: "image/jpeg",
        upsert: false,
      },
    );
    expect(path).toBe("user/asgn/sub/pic.jpg");
  });

  it("reconciles an ambiguous immutable upload by listing the exact path", async () => {
    const mockUpload = jest.fn(async () => ({
      data: null,
      error: { message: "The resource already exists" },
    }));
    const mockList = jest.fn(async () => ({
      data: [{ name: "pic.jpg" }],
      error: null,
    }));
    const mockClient = {
      storage: {
        from: jest.fn(() => ({
          list: mockList,
          upload: mockUpload,
        })),
      },
    } as unknown as SupabaseClient<Database>;

    const gateway = createSubmissionGateway(mockClient);
    const path = await gateway.uploadEvidenceBlob(
      "user/asgn/sub/pic.jpg",
      new ArrayBuffer(10),
      "image/jpeg",
    );

    expect(mockList).toHaveBeenCalledWith("user/asgn/sub", {
      limit: 1,
      search: "pic.jpg",
    });
    expect(path).toBe("user/asgn/sub/pic.jpg");
  });

  it("preserves the upload error when exact-path reconciliation finds nothing", async () => {
    const mockClient = {
      storage: {
        from: jest.fn(() => ({
          list: jest.fn(async () => ({ data: [], error: null })),
          upload: jest.fn(async () => ({
            data: null,
            error: { message: "Upload interrupted" },
          })),
        })),
      },
    } as unknown as SupabaseClient<Database>;

    const gateway = createSubmissionGateway(mockClient);

    await expect(
      gateway.uploadEvidenceBlob(
        "user/asgn/sub/pic.jpg",
        new ArrayBuffer(10),
        "image/jpeg",
      ),
    ).rejects.toThrow("Upload interrupted");
  });

  it("requests revision via request_submission_revision RPC", async () => {
    const mockRpc = jest.fn(async () => ({
      data: {
        ...mockSubmissionRow,
        status: "revision_requested",
        review_note: "Please clean the secondary corner.",
      },
      error: null,
    }));
    const mockClient = {
      rpc: mockRpc,
    } as unknown as SupabaseClient<Database>;

    const gateway = createSubmissionGateway(mockClient);
    const result = await gateway.requestSubmissionRevision({
      submissionId: "a0000000-0000-4000-8000-000000000001",
      reviewNote: "Please clean the secondary corner.",
    });

    expect(mockRpc).toHaveBeenCalledWith("request_submission_revision", {
      p_submission_id: "a0000000-0000-4000-8000-000000000001",
      p_review_note: "Please clean the secondary corner.",
    });
    expect(result.status).toBe("revision_requested");
    expect(result.reviewNote).toBe("Please clean the secondary corner.");
  });

  it("approves assignment completion via approve_assignment_completion RPC", async () => {
    const mockRpc = jest.fn(async () => ({
      data: {
        ...mockSubmissionRow,
        status: "approved",
        review_note: "Work looks great, approved!",
      },
      error: null,
    }));
    const mockClient = {
      rpc: mockRpc,
    } as unknown as SupabaseClient<Database>;

    const gateway = createSubmissionGateway(mockClient);
    const result = await gateway.approveAssignmentCompletion({
      submissionId: "a0000000-0000-4000-8000-000000000001",
      reviewNote: "Work looks great, approved!",
    });

    expect(mockRpc).toHaveBeenCalledWith("approve_assignment_completion", {
      p_submission_id: "a0000000-0000-4000-8000-000000000001",
      p_review_note: "Work looks great, approved!",
    });
    expect(result.status).toBe("approved");
  });

  it("lists assignment submissions via list_assignment_submissions RPC", async () => {
    const mockRpc = jest.fn(async () => ({
      data: [mockSubmissionRow],
      error: null,
    }));
    const mockClient = {
      rpc: mockRpc,
    } as unknown as SupabaseClient<Database>;

    const gateway = createSubmissionGateway(mockClient);
    const list = await gateway.listAssignmentSubmissions(
      "a1000000-0000-4000-8000-000000000001",
    );

    expect(mockRpc).toHaveBeenCalledWith("list_assignment_submissions", {
      p_assignment_id: "a1000000-0000-4000-8000-000000000001",
    });
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("a0000000-0000-4000-8000-000000000001");
  });

  it("gets latest assignment submission via get_latest_assignment_submission RPC", async () => {
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

    expect(mockRpc).toHaveBeenCalledWith("get_latest_assignment_submission", {
      p_assignment_id: "a1000000-0000-4000-8000-000000000001",
    });
    expect(latest?.id).toBe("a0000000-0000-4000-8000-000000000001");
  });
});
