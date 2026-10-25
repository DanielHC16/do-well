import { createReportGateway } from "../report-gateway";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "c3d4e5f6-a7b8-4c3d-8e4f-5a6b7c8d9e0f"),
}));

describe("report-gateway", () => {
  const validUuid = "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d";
  const sampleRow = {
    id: validUuid,
    reporter_id: "b2c3d4e5-f6a7-4b2c-9d3e-4f5a6b7c8d9e",
    category: "scam",
    details: "This gig asks for an upfront registration fee before starting.",
    status: "open",
    subject_profile_id: null,
    gig_id: validUuid,
    assignment_id: null,
    client_request_id: "c3d4e5f6-a7b8-4c3d-8e4f-5a6b7c8d9e0f",
    created_at: "2026-10-26T00:00:00Z",
    updated_at: "2026-10-26T00:00:00Z",
    reviewed_by: null,
    reviewed_at: null,
  };

  it("submits report via RPC with generated client_request_id", async () => {
    const mockRpc = jest
      .fn()
      .mockResolvedValue({ data: sampleRow, error: null });
    const mockClient = {
      rpc: mockRpc,
      from: jest.fn(),
    };

    const gateway = createReportGateway(mockClient as any);
    const report = await gateway.submitReport({
      category: "scam",
      details: "This gig asks for an upfront registration fee before starting.",
      gigId: validUuid,
    });

    expect(mockRpc).toHaveBeenCalledWith(
      "submit_report",
      expect.objectContaining({
        p_category: "scam",
        p_details:
          "This gig asks for an upfront registration fee before starting.",
        p_gig_id: validUuid,
      }),
    );
    expect(report.id).toBe(validUuid);
    expect(report.category).toBe("scam");
  });

  it("lists reports for current user via select", async () => {
    const mockOrder = jest
      .fn()
      .mockResolvedValue({ data: [sampleRow], error: null });
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
    const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });
    const mockClient = {
      rpc: jest.fn(),
      from: mockFrom,
    };

    const gateway = createReportGateway(mockClient as any);
    const reports = await gateway.listMyReports();

    expect(mockFrom).toHaveBeenCalledWith("reports");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(reports).toHaveLength(1);
    expect(reports[0].id).toBe(validUuid);
  });

  it("throws mapped error on RPC failure", async () => {
    const mockRpc = jest.fn().mockResolvedValue({
      data: null,
      error: {
        message: "Report details must contain between 20 and 2000 characters.",
      },
    });
    const mockClient = {
      rpc: mockRpc,
      from: jest.fn(),
    };

    const gateway = createReportGateway(mockClient as any);
    await expect(
      gateway.submitReport({
        category: "scam",
        details:
          "This gig asks for an upfront registration fee before starting.",
        gigId: validUuid,
      }),
    ).rejects.toThrow(
      "Report details must contain between 20 and 2000 characters.",
    );
  });
});
