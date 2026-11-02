import { accountGateway } from "../account-gateway";

const mockRpc = jest.fn();
jest.mock("@/shared/api/supabase", () => ({
  getSupabaseClient: () => ({ rpc: mockRpc }),
}));

const userId = "80000000-0000-4000-8000-000000000001";
const row = {
  user_id: userId,
  role: "admin",
  is_admin: true,
  preferred_mode: "worker",
};

describe("account gateway", () => {
  beforeEach(() => jest.resetAllMocks());

  it("reads the server capability for the active account", async () => {
    mockRpc.mockResolvedValue({ data: [row], error: null });
    await expect(accountGateway.getCapabilities(userId)).resolves.toEqual({
      userId,
      isAdmin: true,
      preferredMode: "worker",
    });
    expect(mockRpc).toHaveBeenCalledWith("get_my_capabilities");
  });

  it("rejects malformed or mismatched capabilities instead of granting access", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ ...row, is_admin: "true" }],
      error: null,
    });
    await expect(accountGateway.getCapabilities(userId)).rejects.toThrow();
    mockRpc.mockResolvedValueOnce({
      data: [{ ...row, user_id: "80000000-0000-4000-8000-000000000002" }],
      error: null,
    });
    await expect(accountGateway.getCapabilities(userId)).rejects.toThrow();
  });

  it("propagates server denial without accepting returned data", async () => {
    mockRpc.mockResolvedValue({ data: [row], error: { code: "42501" } });
    await expect(accountGateway.getCapabilities(userId)).rejects.toThrow();
  });

  it("persists only the supported workspace through the existing RPC", async () => {
    mockRpc.mockResolvedValue({
      data: { id: userId, preferred_mode: "employer" },
      error: null,
    });
    await expect(
      accountGateway.setPreferredMode(userId, "employer"),
    ).resolves.toBeUndefined();
    expect(mockRpc).toHaveBeenCalledWith("set_preferred_mode", {
      p_mode: "employer",
    });
  });

  it("rejects a failed preference save and another user's response", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: "42501" } });
    await expect(
      accountGateway.setPreferredMode(userId, "employer"),
    ).rejects.toThrow();
    mockRpc.mockResolvedValueOnce({
      data: {
        id: "80000000-0000-4000-8000-000000000002",
        preferred_mode: "employer",
      },
      error: null,
    });
    await expect(
      accountGateway.setPreferredMode(userId, "employer"),
    ).rejects.toThrow();
  });
});
