import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.generated";

import { createGigGateway } from "../gig-gateway";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

function createFakeSupabase() {
  const fakeRow = {
    id: "a0000000-0000-4000-8000-000000000001",
    employer_id: "e0000000-0000-4000-8000-000000000001",
    title: "Backyard Cleanup and Leaves",
    description: "Raking fallen leaves and clearing perimeter walkway.",
    category: "cleaning" as const,
    work_mode: "onsite" as const,
    public_area: "Makati",
    public_latitude: 14.55,
    public_longitude: 121.02,
    budget_amount: 600,
    currency: "PHP",
    status: "draft" as const,
    application_deadline: null,
    due_at: null,
    published_at: null,
    closed_at: null,
    created_at: "2026-10-25T00:00:00.000Z",
    updated_at: "2026-10-25T00:00:00.000Z",
  };

  const client = {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(async () => ({ data: fakeRow, error: null })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(async () => ({
                data: { ...fakeRow, title: "Updated Backyard Cleanup Title" },
                error: null,
              })),
            })),
          })),
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(async () => ({ data: [fakeRow], error: null })),
          maybeSingle: jest.fn(async () => ({ data: fakeRow, error: null })),
        })),
      })),
    })),
    rpc: jest.fn(async (fnName: string) => {
      if (fnName === "publish_gig") {
        return {
          data: [
            {
              ...fakeRow,
              status: "published",
              published_at: "2026-10-25T01:00:00.000Z",
            },
          ],
          error: null,
        };
      }
      if (fnName === "close_gig") {
        return {
          data: [
            {
              ...fakeRow,
              status: "closed",
              closed_at: "2026-10-25T02:00:00.000Z",
            },
          ],
          error: null,
        };
      }
      return { data: null, error: new Error("Unknown RPC") };
    }),
  } as unknown as SupabaseClient<Database>;

  return { client, fakeRow };
}

describe("gig gateway", () => {
  it("creates a draft gig row and normalizes domain output", async () => {
    const { client } = createFakeSupabase();
    const gateway = createGigGateway(client);

    const input = {
      title: "Backyard Cleanup and Leaves",
      description: "Raking fallen leaves and clearing perimeter walkway.",
      category: "cleaning" as const,
      workMode: "onsite" as const,
      publicArea: "Makati",
      budgetAmount: 600,
      currency: "PHP" as const,
    };

    const gig = await gateway.createDraft(
      input,
      "e0000000-0000-4000-8000-000000000001",
    );
    expect(gig.id).toBe("a0000000-0000-4000-8000-000000000001");
    expect(gig.status).toBe("draft");
    expect(gig.budgetAmount).toBe(600);
  });

  it("publishes gig via RPC and returns published status", async () => {
    const { client } = createFakeSupabase();
    const gateway = createGigGateway(client);

    const published = await gateway.publishGig(
      "a0000000-0000-4000-8000-000000000001",
    );
    expect(published.status).toBe("published");
    expect(published.publishedAt).toBe("2026-10-25T01:00:00.000Z");
  });

  it("closes gig via RPC and returns closed status", async () => {
    const { client } = createFakeSupabase();
    const gateway = createGigGateway(client);

    const closed = await gateway.closeGig(
      "a0000000-0000-4000-8000-000000000001",
    );
    expect(closed.status).toBe("closed");
    expect(closed.closedAt).toBe("2026-10-25T02:00:00.000Z");
  });

  it("lists employer gigs", async () => {
    const { client } = createFakeSupabase();
    const gateway = createGigGateway(client);

    const list = await gateway.listEmployerGigs(
      "e0000000-0000-4000-8000-000000000001",
    );
    expect(list.length).toBe(1);
    expect(list[0].employerId).toBe("e0000000-0000-4000-8000-000000000001");
  });
});
