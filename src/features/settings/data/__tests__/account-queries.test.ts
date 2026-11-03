import { accountGateway } from "../account-gateway";
import { fetchAccountCapabilities } from "../account-queries";

jest.mock("../account-gateway", () => ({
  accountGateway: { getCapabilities: jest.fn() },
}));

const userId = "80000000-0000-4000-8000-000000000001";
const capabilities = {
  userId,
  isAdmin: false,
  preferredMode: "worker" as const,
};

describe("scoped account queries", () => {
  beforeEach(() => jest.clearAllMocks());

  it("uses a fresh server read for each startup instead of retaining a capability cache", async () => {
    jest
      .mocked(accountGateway.getCapabilities)
      .mockResolvedValueOnce(capabilities)
      .mockResolvedValueOnce({ ...capabilities, isAdmin: true });

    await expect(fetchAccountCapabilities(userId)).resolves.toEqual(
      capabilities,
    );
    await expect(fetchAccountCapabilities(userId)).resolves.toMatchObject({
      isAdmin: true,
    });

    expect(accountGateway.getCapabilities).toHaveBeenCalledTimes(2);
    expect(accountGateway.getCapabilities).toHaveBeenNthCalledWith(2, userId);
  });

  it("fails once on server denial without automatic retries or cached-role fallback", async () => {
    jest
      .mocked(accountGateway.getCapabilities)
      .mockRejectedValueOnce(new Error("Denied"));

    await expect(fetchAccountCapabilities(userId)).rejects.toThrow("Denied");
    expect(accountGateway.getCapabilities).toHaveBeenCalledTimes(1);
  });
});
