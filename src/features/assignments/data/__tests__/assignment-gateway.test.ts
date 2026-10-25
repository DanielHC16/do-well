import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.generated";

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
