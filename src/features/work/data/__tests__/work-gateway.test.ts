import { createWorkGateway } from "../work-gateway";

jest.mock("@/shared/api/supabase", () => ({ getSupabaseClient: jest.fn() }));

const userId = "11111111-1111-4111-8111-111111111111";
const gigId = "22222222-2222-4222-8222-222222222222";
const port = () => ({
  listApplications: jest.fn(async () => ({ data: [], error: null })),
  listAssignments: jest.fn(async () => ({ data: [], error: null })),
  listListings: jest.fn(async () => ({ data: [], error: null })),
});

describe("work gateway", () => {
  it("scopes worker applications and maps authoritative status and gig title", async () => {
    const source = {
      ...port(),
      listApplications: jest.fn(async () => ({
        data: [
          {
            id: gigId,
            gig_id: gigId,
            status: "pending",
            created_at: "2026-10-31T00:00:00Z",
            gigs: {
              title: "Design a poster",
              budget_amount: 800,
              due_at: null,
            },
          },
        ],
        error: null,
      })),
    };
    const items = await createWorkGateway(source).list(
      userId,
      "worker",
      "applications",
      0,
    );
    expect(source.listApplications).toHaveBeenCalledWith(userId, 0);
    expect(items[0]).toMatchObject({
      title: "Design a poster",
      status: "pending",
      amount: 800,
      kind: "application",
    });
  });

  it("uses the employer participant scope for completed work", async () => {
    const source = port();
    await createWorkGateway(source).list(userId, "employer", "completed", 20);
    expect(source.listAssignments).toHaveBeenCalledWith(
      userId,
      "employer",
      true,
      20,
    );
    expect(source.listApplications).not.toHaveBeenCalled();
  });

  it("rejects malformed rows and hides provider errors", async () => {
    const source = {
      ...port(),
      listListings: jest.fn(async () => ({
        data: [{ id: "bad" }],
        error: null,
      })),
    };
    await expect(
      createWorkGateway(source).list(userId, "employer", "listings", 0),
    ).rejects.toThrow("We couldn't load your work. Try again.");
    const failing = {
      ...port(),
      listApplications: jest.fn(async () => ({
        data: null,
        error: { message: "private provider details" },
      })),
    };
    await expect(
      createWorkGateway(failing).list(userId, "worker", "applications", 0),
    ).rejects.toThrow("We couldn't load your work. Try again.");
  });

  it("rejects invalid identity before accessing the service", async () => {
    const source = port();
    await expect(
      createWorkGateway(source).list("", "worker", "active", 0),
    ).rejects.toThrow();
    expect(source.listAssignments).not.toHaveBeenCalled();
  });
});
