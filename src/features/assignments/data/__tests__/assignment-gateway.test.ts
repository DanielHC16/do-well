import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.generated";
import type { AssignmentDetail } from "../../model/assignment-schemas";

import { createAssignmentGateway } from "../assignment-gateway";

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(async () => undefined),
  getItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => undefined),
}));

const mockRawAssignment = {
  id: "90000000-0000-4000-8000-000000000001",
  gig_id: "91000000-0000-4000-8000-000000000001",
  application_id: "92000000-0000-4000-8000-000000000001",
  employer_id: "80000000-0000-4000-8000-000000000001",
  worker_id: "80000000-0000-4000-8000-000000000002",
  agreement_version: 1,
  agreed_title: "Office Furniture Assembly",
  agreed_description:
    "Assemble 4 ergonomic desks and 6 chairs in Makati office.",
  agreed_amount: "2500.00",
  currency: "PHP",
  due_at: null,
  status: "proposed",
  employer_confirmed_at: "2026-10-25T01:00:00.000Z",
  worker_confirmed_at: null,
  started_at: null,
  completed_at: null,
  cancelled_at: null,
  client_request_id: "93000000-0000-4000-8000-000000000001",
  created_at: "2026-10-25T01:00:00.000Z",
  updated_at: "2026-10-25T01:00:00.000Z",
};

const mockRawMilestone = {
  id: "94000000-0000-4000-8000-000000000001",
  assignment_id: "90000000-0000-4000-8000-000000000001",
  position: 1,
  title: "Desk Assembly",
  description: "Assemble and align 4 desks.",
  due_at: null,
  status: "pending",
  approved_at: null,
  created_at: "2026-10-25T01:00:00.000Z",
  updated_at: "2026-10-25T01:00:00.000Z",
};

const privateDetail: AssignmentDetail = {
  assignment: {
    id: mockRawAssignment.id,
    gigId: mockRawAssignment.gig_id,
    applicationId: mockRawAssignment.application_id,
    employerId: mockRawAssignment.employer_id,
    workerId: mockRawAssignment.worker_id,
    agreementVersion: 1,
    agreedTitle: "Private office agreement",
    agreedDescription:
      "Private participant terms for assembling office furniture.",
    agreedAmount: 2500,
    currency: "PHP",
    dueAt: null,
    status: "proposed",
    employerConfirmedAt: mockRawAssignment.employer_confirmed_at,
    workerConfirmedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    clientRequestId: mockRawAssignment.client_request_id,
    createdAt: mockRawAssignment.created_at,
    updatedAt: mockRawAssignment.updated_at,
  },
  employer: {
    id: mockRawAssignment.employer_id,
    displayName: "Elena",
    homeArea: "Makati",
  },
  worker: {
    id: mockRawAssignment.worker_id,
    displayName: "Warren",
    homeArea: "Makati",
  },
  gig: {
    id: mockRawAssignment.gig_id,
    title: "Private office agreement",
    category: "admin",
    workMode: "onsite",
    publicArea: "Makati",
  },
};

function privateCache(
  detail: unknown = privateDetail,
  userId = privateDetail.assignment.workerId,
) {
  return {
    get: jest.fn().mockResolvedValue({
      data: detail,
      userId,
      cachedAt: "2026-10-31T00:00:00Z",
    }),
    set: jest.fn(),
    remove: jest.fn(),
    purgeUser: jest.fn(),
    clearAll: jest.fn(),
  };
}

describe("private assignment cache boundaries", () => {
  it("ignores legacy anonymous private data during a network failure", async () => {
    const cache = privateCache(privateDetail, "anonymous");
    const rpc = jest
      .fn()
      .mockRejectedValue(new TypeError("Network request failed"));
    // The small test double implements only the RPC boundary this test exercises.
    const gateway = createAssignmentGateway(
      { rpc } as unknown as SupabaseClient<Database>,
      cache,
    );
    await expect(
      gateway.getAssignmentDetail(privateDetail.assignment.id),
    ).rejects.toThrow();
    expect(cache.get).not.toHaveBeenCalled();
  });

  it("rejects malformed private cache data", async () => {
    const cache = privateCache({
      assignment: { id: privateDetail.assignment.id },
    });
    const rpc = jest
      .fn()
      .mockRejectedValue(new TypeError("Network request failed"));
    // The small test double implements only the RPC boundary this test exercises.
    const gateway = createAssignmentGateway(
      { rpc } as unknown as SupabaseClient<Database>,
      cache,
    );
    await expect(
      gateway.getAssignmentDetail(
        privateDetail.assignment.id,
        privateDetail.assignment.workerId,
      ),
    ).rejects.toThrow();
  });

  it.each([401, 403])(
    "does not use cache after HTTP %s even if error mentions network",
    async (status) => {
      const cache = privateCache();
      const rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { status, message: "Network request denied" },
      });
      // The small test double implements only the RPC boundary this test exercises.
      const gateway = createAssignmentGateway(
        { rpc } as unknown as SupabaseClient<Database>,
        cache,
      );
      await expect(
        gateway.getAssignmentDetail(
          privateDetail.assignment.id,
          privateDetail.assignment.workerId,
        ),
      ).rejects.toThrow();
      expect(cache.get).not.toHaveBeenCalled();
    },
  );
  it("never writes or reads legacy anonymous private records across account switches", async () => {
    const cache = privateCache(privateDetail, "anonymous");
    const rpc = jest
      .fn()
      .mockResolvedValueOnce({ data: privateDetail, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { code: "42501", message: "Permission denied" },
      });
    // The small test double implements only the RPC boundary this test exercises.
    const gateway = createAssignmentGateway(
      { rpc } as unknown as SupabaseClient<Database>,
      cache,
    );
    await gateway.getAssignmentDetail(privateDetail.assignment.id);
    await expect(
      gateway.getAssignmentDetail(privateDetail.assignment.id),
    ).rejects.toThrow();
    expect(cache.set).not.toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();
  });

  it.each(["42501", "28000", "PGRST301", "PGRST302", "PGRST303"])(
    "does not bypass server auth failure %s using a cached record",
    async (code) => {
      const cache = privateCache();
      const rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { code, message: "Access unavailable" },
      });
      // The small test double implements only the RPC boundary this test exercises.
      const gateway = createAssignmentGateway(
        { rpc } as unknown as SupabaseClient<Database>,
        cache,
      );
      await expect(
        gateway.getAssignmentDetail(
          privateDetail.assignment.id,
          privateDetail.assignment.workerId,
        ),
      ).rejects.toThrow();
      expect(cache.get).not.toHaveBeenCalled();
    },
  );

  it("rejects another participant's cached data even when stored in the requested namespace", async () => {
    const stranger = "80000000-0000-4000-8000-000000000003";
    const cache = privateCache(privateDetail, stranger);
    const rpc = jest
      .fn()
      .mockRejectedValue(new TypeError("Network request failed"));
    // The small test double implements only the RPC boundary this test exercises.
    const gateway = createAssignmentGateway(
      { rpc } as unknown as SupabaseClient<Database>,
      cache,
    );
    await expect(
      gateway.getAssignmentDetail(privateDetail.assignment.id, stranger),
    ).rejects.toThrow();
  });

  it("rejects cache envelopes belonging to another identity", async () => {
    const cache = privateCache(
      privateDetail,
      privateDetail.assignment.employerId,
    );
    const rpc = jest
      .fn()
      .mockRejectedValue(new TypeError("Network request failed"));
    // The small test double implements only the RPC boundary this test exercises.
    const gateway = createAssignmentGateway(
      { rpc } as unknown as SupabaseClient<Database>,
      cache,
    );
    await expect(
      gateway.getAssignmentDetail(
        privateDetail.assignment.id,
        privateDetail.assignment.workerId,
      ),
    ).rejects.toThrow();
  });

  it("rejects a cached agreement with the wrong assignment id", async () => {
    const cache = privateCache();
    const rpc = jest
      .fn()
      .mockRejectedValue(new TypeError("Network request failed"));
    // The small test double implements only the RPC boundary this test exercises.
    const gateway = createAssignmentGateway(
      { rpc } as unknown as SupabaseClient<Database>,
      cache,
    );
    await expect(
      gateway.getAssignmentDetail(
        "90000000-0000-4000-8000-000000000002",
        privateDetail.assignment.workerId,
      ),
    ).rejects.toThrow();
  });
});

describe("AssignmentGateway", () => {
  it("confirms an assignment successfully", async () => {
    const rpcMock = jest.fn(async () => ({
      data: {
        ...mockRawAssignment,
        status: "active",
        worker_confirmed_at: "2026-10-25T02:00:00.000Z",
        started_at: "2026-10-25T02:00:00.000Z",
      },
      error: null,
    }));
    const client = { rpc: rpcMock } as unknown as SupabaseClient<Database>;
    const gateway = createAssignmentGateway(client);

    const result = await gateway.confirmAssignment(
      "90000000-0000-4000-8000-000000000001",
    );
    expect(rpcMock).toHaveBeenCalledWith("confirm_assignment", {
      p_assignment_id: "90000000-0000-4000-8000-000000000001",
    });
    expect(result.status).toBe("active");
    expect(result.agreedAmount).toBe(2500);
  });

  it("declines an assignment successfully", async () => {
    const rpcMock = jest.fn(async () => ({
      data: {
        ...mockRawAssignment,
        status: "declined",
        cancelled_at: "2026-10-25T02:00:00.000Z",
      },
      error: null,
    }));
    const client = { rpc: rpcMock } as unknown as SupabaseClient<Database>;
    const gateway = createAssignmentGateway(client);

    const result = await gateway.declineAssignment(
      "90000000-0000-4000-8000-000000000001",
    );
    expect(rpcMock).toHaveBeenCalledWith("decline_assignment", {
      p_assignment_id: "90000000-0000-4000-8000-000000000001",
    });
    expect(result.status).toBe("declined");
  });

  it("cancels a proposed assignment successfully", async () => {
    const rpcMock = jest.fn(async () => ({
      data: {
        ...mockRawAssignment,
        status: "cancelled",
        cancelled_at: "2026-10-25T02:00:00.000Z",
      },
      error: null,
    }));
    const client = { rpc: rpcMock } as unknown as SupabaseClient<Database>;
    const gateway = createAssignmentGateway(client);

    const result = await gateway.cancelProposedAssignment(
      "90000000-0000-4000-8000-000000000001",
    );
    expect(result.status).toBe("cancelled");
  });

  it("creates a milestone", async () => {
    const rpcMock = jest.fn(async () => ({
      data: mockRawMilestone,
      error: null,
    }));
    const client = { rpc: rpcMock } as unknown as SupabaseClient<Database>;
    const gateway = createAssignmentGateway(client);

    const result = await gateway.createMilestone({
      assignmentId: "90000000-0000-4000-8000-000000000001",
      title: "Desk Assembly",
      description: "Assemble and align 4 desks.",
    });
    expect(rpcMock).toHaveBeenCalledWith("create_assignment_milestone", {
      p_assignment_id: "90000000-0000-4000-8000-000000000001",
      p_title: "Desk Assembly",
      p_description: "Assemble and align 4 desks.",
      p_due_at: undefined,
    });
    expect(result.position).toBe(1);
    expect(result.status).toBe("pending");
  });

  it("starts a milestone", async () => {
    const rpcMock = jest.fn(async () => ({
      data: {
        ...mockRawMilestone,
        status: "in_progress",
      },
      error: null,
    }));
    const client = { rpc: rpcMock } as unknown as SupabaseClient<Database>;
    const gateway = createAssignmentGateway(client);

    const result = await gateway.startMilestone(
      "94000000-0000-4000-8000-000000000001",
    );
    expect(rpcMock).toHaveBeenCalledWith("start_assignment_milestone", {
      p_milestone_id: "94000000-0000-4000-8000-000000000001",
    });
    expect(result.status).toBe("in_progress");
  });

  it("lists assignment milestones", async () => {
    const rpcMock = jest.fn(async () => ({
      data: [mockRawMilestone],
      error: null,
    }));
    const client = { rpc: rpcMock } as unknown as SupabaseClient<Database>;
    const gateway = createAssignmentGateway(client);

    const list = await gateway.listMilestones(
      "90000000-0000-4000-8000-000000000001",
    );
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Desk Assembly");
  });

  it("fetches assignment detail", async () => {
    const rpcMock = jest.fn(async () => ({
      data: {
        assignment: {
          id: mockRawAssignment.id,
          gigId: mockRawAssignment.gig_id,
          applicationId: mockRawAssignment.application_id,
          employerId: mockRawAssignment.employer_id,
          workerId: mockRawAssignment.worker_id,
          agreementVersion: mockRawAssignment.agreement_version,
          agreedTitle: mockRawAssignment.agreed_title,
          agreedDescription: mockRawAssignment.agreed_description,
          agreedAmount: 2500,
          currency: "PHP",
          dueAt: null,
          status: "proposed",
          employerConfirmedAt: mockRawAssignment.employer_confirmed_at,
          workerConfirmedAt: null,
          startedAt: null,
          completedAt: null,
          cancelledAt: null,
          clientRequestId: mockRawAssignment.client_request_id,
          createdAt: mockRawAssignment.created_at,
          updatedAt: mockRawAssignment.updated_at,
        },
        employer: {
          id: "80000000-0000-4000-8000-000000000001",
          displayName: "Elena Employer",
          homeArea: "Makati",
        },
        worker: {
          id: "80000000-0000-4000-8000-000000000002",
          displayName: "Warren Worker",
          homeArea: "Makati",
        },
        gig: {
          id: mockRawAssignment.gig_id,
          title: "Office Furniture Assembly",
          category: "assembly",
          workMode: "onsite",
          publicArea: "Makati",
        },
      },
      error: null,
    }));
    const client = { rpc: rpcMock } as unknown as SupabaseClient<Database>;
    const gateway = createAssignmentGateway(client);

    const detail = await gateway.getAssignmentDetail(
      "90000000-0000-4000-8000-000000000001",
    );
    expect(detail.assignment.agreedTitle).toBe("Office Furniture Assembly");
    expect(detail.employer.displayName).toBe("Elena Employer");
  });

  it("writes to cache on successful getAssignmentDetail call", async () => {
    const mockDetailData = {
      assignment: {
        id: mockRawAssignment.id,
        gigId: mockRawAssignment.gig_id,
        applicationId: mockRawAssignment.application_id,
        employerId: mockRawAssignment.employer_id,
        workerId: mockRawAssignment.worker_id,
        agreementVersion: 1,
        agreedTitle: "Office Furniture Assembly",
        agreedDescription: "Assemble office chairs and desks carefully.",
        agreedAmount: 2500,
        currency: "PHP",
        dueAt: null,
        status: "proposed",
        employerConfirmedAt: "2026-10-25T01:00:00.000Z",
        workerConfirmedAt: null,
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        clientRequestId: mockRawAssignment.client_request_id,
        createdAt: "2026-10-25T01:00:00.000Z",
        updatedAt: "2026-10-25T01:00:00.000Z",
      },
      employer: {
        id: "80000000-0000-4000-8000-000000000001",
        displayName: "Elena Employer",
        homeArea: "Makati",
      },
      worker: {
        id: "80000000-0000-4000-8000-000000000002",
        displayName: "Warren Worker",
        homeArea: "Makati",
      },
      gig: {
        id: mockRawAssignment.gig_id,
        title: "Office Furniture Assembly",
        category: "assembly",
        workMode: "onsite",
        publicArea: "Makati",
      },
    };

    const client = {
      rpc: jest.fn().mockResolvedValue({ data: mockDetailData, error: null }),
    } as unknown as SupabaseClient<Database>;

    const mockCache = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn(),
      purgeUser: jest.fn(),
      clearAll: jest.fn(),
    };

    const gateway = createAssignmentGateway(client, mockCache as any);
    const result = await gateway.getAssignmentDetailWithMetadata(
      mockRawAssignment.id,
      mockRawAssignment.worker_id,
    );

    expect(result.isFromCache).toBe(false);
    expect(result.detail.assignment.agreedTitle).toBe(
      "Office Furniture Assembly",
    );
    expect(mockCache.set).toHaveBeenCalledWith(
      mockRawAssignment.worker_id,
      `assignment:detail:${mockRawAssignment.id}`,
      result.detail,
    );
  });

  it("falls back to cached assignment detail when network fails", async () => {
    const failingClient = {
      rpc: jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Network connection lost" },
      }),
    } as unknown as SupabaseClient<Database>;

    const cachedDetail = {
      assignment: {
        id: mockRawAssignment.id,
        gigId: mockRawAssignment.gig_id,
        applicationId: mockRawAssignment.application_id,
        employerId: mockRawAssignment.employer_id,
        workerId: mockRawAssignment.worker_id,
        agreementVersion: 1,
        agreedTitle: "Cached Furniture Assembly",
        agreedDescription: "Assemble office chairs and desks carefully.",
        agreedAmount: 2500,
        currency: "PHP" as const,
        dueAt: null,
        status: "proposed" as const,
        employerConfirmedAt: "2026-10-25T01:00:00.000Z",
        workerConfirmedAt: null,
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        clientRequestId: mockRawAssignment.client_request_id,
        createdAt: "2026-10-25T01:00:00.000Z",
        updatedAt: "2026-10-25T01:00:00.000Z",
      },
      employer: {
        id: "80000000-0000-4000-8000-000000000001",
        displayName: "Elena Employer",
        homeArea: "Makati",
      },
      worker: {
        id: "80000000-0000-4000-8000-000000000002",
        displayName: "Warren Worker",
        homeArea: "Makati",
      },
      gig: {
        id: mockRawAssignment.gig_id,
        title: "Office Furniture Assembly",
        category: "assembly" as const,
        workMode: "onsite" as const,
        publicArea: "Makati",
      },
    };

    const mockCache = {
      get: jest.fn().mockResolvedValue({
        data: cachedDetail,
        cachedAt: "2026-10-25T11:00:00.000Z",
        userId: mockRawAssignment.worker_id,
        version: 1,
        key: `assignment:detail:${mockRawAssignment.id}`,
        byteSize: 200,
      }),
      set: jest.fn(),
      remove: jest.fn(),
      purgeUser: jest.fn(),
      clearAll: jest.fn(),
    };

    const gateway = createAssignmentGateway(failingClient, mockCache as any);
    const result = await gateway.getAssignmentDetailWithMetadata(
      mockRawAssignment.id,
      mockRawAssignment.worker_id,
    );

    expect(result.isFromCache).toBe(true);
    expect(result.cachedAt).toBe("2026-10-25T11:00:00.000Z");
    expect(result.detail.assignment.agreedTitle).toBe(
      "Cached Furniture Assembly",
    );

    // Also verify getAssignmentDetail returns cached data directly
    const directFallback = await gateway.getAssignmentDetail(
      mockRawAssignment.id,
      mockRawAssignment.worker_id,
    );
    expect(directFallback.assignment.agreedTitle).toBe(
      "Cached Furniture Assembly",
    );
  });

  it("lists user activity and marks event read", async () => {
    const rawActivity = {
      id: "95000000-0000-4000-8000-000000000001",
      event_type: "assignment_confirmed",
      payload: { title: "Office Assembly" },
      dedupe_key: "assignment_confirmed:1",
      read_at: null,
      created_at: "2026-10-25T01:00:00.000Z",
      gig_id: "91000000-0000-4000-8000-000000000001",
      assignment_id: "90000000-0000-4000-8000-000000000001",
    };

    const rpcMock = jest.fn(async (fn: string) => {
      if (fn === "list_user_activity") {
        return { data: [rawActivity], error: null };
      }
      if (fn === "mark_activity_read") {
        return {
          data: {
            ...rawActivity,
            read_at: "2026-10-25T02:00:00.000Z",
            recipient_id: "80000000-0000-4000-8000-000000000001",
            updated_at: "2026-10-25T02:00:00.000Z",
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    const client = { rpc: rpcMock } as unknown as SupabaseClient<Database>;
    const gateway = createAssignmentGateway(client);

    const events = await gateway.listUserActivity();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("assignment_confirmed");

    const read = await gateway.markActivityRead(
      "95000000-0000-4000-8000-000000000001",
    );
    expect(read.readAt).toBe("2026-10-25T02:00:00.000Z");
  });
});
