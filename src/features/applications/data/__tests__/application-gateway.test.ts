import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.generated";

import { createApplicationGateway } from "../application-gateway";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "d0000000-0000-4000-8000-000000000099"),
}));

function createFakeSupabase() {
  const fakeApp = {
    id: "a0000000-0000-4000-8000-000000000001",
    gig_id: "b0000000-0000-4000-8000-000000000001",
    worker_id: "c0000000-0000-4000-8000-000000000001",
    message: "Reliable worker with tools.",
    status: "pending",
    client_request_id: "d0000000-0000-4000-8000-000000000099",
    decided_at: null,
    created_at: "2026-10-25T01:00:00.000Z",
    updated_at: "2026-10-25T01:00:00.000Z",
  };

  const fakeApplicantSummary = {
    id: "a0000000-0000-4000-8000-000000000001",
    gig_id: "b0000000-0000-4000-8000-000000000001",
    worker_id: "c0000000-0000-4000-8000-000000000001",
    message: "Reliable worker with tools.",
    status: "pending",
    decided_at: null,
    created_at: "2026-10-25T01:00:00.000Z",
    worker_display_name: "Warren Worker",
    worker_home_area: "Makati",
  };

  const fakeAssignment = {
    id: "e0000000-0000-4000-8000-000000000001",
    gig_id: "b0000000-0000-4000-8000-000000000001",
    application_id: "a0000000-0000-4000-8000-000000000001",
    employer_id: "f0000000-0000-4000-8000-000000000001",
    worker_id: "c0000000-0000-4000-8000-000000000001",
    agreement_version: 1,
    agreed_title: "Warehouse Inventory Sorting",
    agreed_description:
      "Help sort delivered boxes and label inventory shelves with care.",
    agreed_amount: 950,
    currency: "PHP",
    due_at: null,
    status: "proposed",
    employer_confirmed_at: "2026-10-25T01:00:00.000Z",
    worker_confirmed_at: null,
    started_at: null,
    completed_at: null,
    cancelled_at: null,
    client_request_id: "d0000000-0000-4000-8000-000000000099",
    created_at: "2026-10-25T01:00:00.000Z",
    updated_at: "2026-10-25T01:00:00.000Z",
  };

  const client = {
    rpc: jest.fn(async (fnName: string, params: Record<string, unknown>) => {
      if (fnName === "apply_to_gig") {
        return { data: fakeApp, error: null };
      }
      if (fnName === "withdraw_application") {
        return { data: { ...fakeApp, status: "withdrawn" }, error: null };
      }
      if (fnName === "select_worker_atomic") {
        return { data: fakeAssignment, error: null };
      }
      if (fnName === "list_gig_applicants") {
        return { data: [fakeApplicantSummary], error: null };
      }
      if (fnName === "get_worker_application_for_gig") {
        return { data: fakeApp, error: null };
      }
      return { data: null, error: new Error(`Unknown RPC: ${fnName}`) };
    }),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(async () => ({
            data: fakeAssignment,
            error: null,
          })),
        })),
      })),
    })),
  } as unknown as SupabaseClient<Database>;

  return { client, fakeApp, fakeApplicantSummary, fakeAssignment };
}

describe("application gateway", () => {
  it("calls apply_to_gig RPC and maps returned record", async () => {
    const { client, fakeApp } = createFakeSupabase();
    const gateway = createApplicationGateway(client);

    const result = await gateway.applyToGig({
      gigId: fakeApp.gig_id,
      message: "Ready to work",
    });

    expect(client.rpc).toHaveBeenCalledWith("apply_to_gig", {
      p_gig_id: fakeApp.gig_id,
      p_message: "Ready to work",
      p_client_request_id: "d0000000-0000-4000-8000-000000000099",
    });

    expect(result.id).toBe(fakeApp.id);
    expect(result.status).toBe("pending");
  });

  it("calls withdraw_application RPC and returns updated record", async () => {
    const { client, fakeApp } = createFakeSupabase();
    const gateway = createApplicationGateway(client);

    const result = await gateway.withdrawApplication(fakeApp.id);

    expect(client.rpc).toHaveBeenCalledWith("withdraw_application", {
      p_application_id: fakeApp.id,
    });
    expect(result.status).toBe("withdrawn");
  });

  it("calls select_worker_atomic RPC and returns assignment", async () => {
    const { client, fakeApp, fakeAssignment } = createFakeSupabase();
    const gateway = createApplicationGateway(client);

    const result = await gateway.selectWorkerAtomic({
      applicationId: fakeApp.id,
    });

    expect(client.rpc).toHaveBeenCalledWith("select_worker_atomic", {
      p_application_id: fakeApp.id,
      p_client_request_id: "d0000000-0000-4000-8000-000000000099",
    });
    expect(result.id).toBe(fakeAssignment.id);
    expect(result.status).toBe("proposed");
  });

  it("lists gig applicants with applicant profile info", async () => {
    const { client, fakeApp } = createFakeSupabase();
    const gateway = createApplicationGateway(client);

    const applicants = await gateway.listGigApplicants(fakeApp.gig_id);

    expect(client.rpc).toHaveBeenCalledWith("list_gig_applicants", {
      p_gig_id: fakeApp.gig_id,
    });
    expect(applicants).toHaveLength(1);
    expect(applicants[0].workerDisplayName).toBe("Warren Worker");
  });

  it("fetches worker application for gig", async () => {
    const { client, fakeApp } = createFakeSupabase();
    const gateway = createApplicationGateway(client);

    const app = await gateway.getWorkerApplicationForGig(fakeApp.gig_id);

    expect(client.rpc).toHaveBeenCalledWith("get_worker_application_for_gig", {
      p_gig_id: fakeApp.gig_id,
    });
    expect(app).not.toBeNull();
    expect(app?.id).toBe(fakeApp.id);
  });
});
