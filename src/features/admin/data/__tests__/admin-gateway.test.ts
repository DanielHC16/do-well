import { adminGateway } from "../admin-gateway";

const mockRpc = jest.fn();
jest.mock("@/shared/api/supabase", () => ({
  getSupabaseClient: () => ({ rpc: mockRpc }),
}));

const report = {
  id: "a0000000-0000-4000-8000-000000000001",
  reporter_id: "80000000-0000-4000-8000-000000000002",
  subject_profile_id: null,
  gig_id: "90000000-0000-4000-8000-000000000001",
  assignment_id: null,
  category: "unsafe",
  details: "Unsafe wiring in the notice.",
  status: "open",
  resolution_note: null,
  reviewed_by: null,
  reviewed_at: null,
  created_at: "2026-10-26T01:00:00.000Z",
};

describe("admin gateway", () => {
  beforeEach(() => jest.resetAllMocks());

  it("maps validated server overview fields", async () => {
    mockRpc.mockResolvedValue({
      data: {
        profiles: 12,
        open_reports: 2,
        published_gigs: 7,
        active_assignments: 3,
      },
      error: null,
    });
    await expect(adminGateway.getAdminOverview()).resolves.toEqual({
      profiles: 12,
      openReports: 2,
      publishedGigs: 7,
      activeAssignments: 3,
    });
    expect(mockRpc).toHaveBeenCalledWith("get_admin_overview");
  });

  it("loads a bounded open report queue and maps its moderation fields", async () => {
    mockRpc.mockResolvedValue({ data: [report], error: null });
    const reports = await adminGateway.listAdminReports();
    expect(reports[0]).toEqual({
      id: report.id,
      reporterId: report.reporter_id,
      subjectProfileId: null,
      gigId: report.gig_id,
      assignmentId: null,
      category: "unsafe",
      details: report.details,
      status: "open",
      resolutionNote: null,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: report.created_at,
    });
    expect(mockRpc).toHaveBeenCalledWith("list_admin_reports", {
      p_status: "open",
      p_limit: 20,
      p_offset: 0,
    });
  });

  it("preserves server authorization denial for all admin operations", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    await expect(adminGateway.getAdminOverview()).rejects.toThrow();
    await expect(adminGateway.listAdminReports()).rejects.toThrow();
    await expect(
      adminGateway.resolveReport(
        report.id,
        "resolved",
        "Reviewed and resolved safely.",
      ),
    ).rejects.toThrow();
  });

  it("rejects malformed admin payloads", async () => {
    mockRpc.mockResolvedValueOnce({ data: { profiles: -1 }, error: null });
    await expect(adminGateway.getAdminOverview()).rejects.toThrow();
    mockRpc.mockResolvedValueOnce({
      data: [{ ...report, status: "unknown" }],
      error: null,
    });
    await expect(adminGateway.listAdminReports()).rejects.toThrow();
  });

  it("validates the moderation note before calling the existing resolve RPC", async () => {
    await expect(
      adminGateway.resolveReport(report.id, "resolved", "short"),
    ).rejects.toThrow();
    expect(mockRpc).not.toHaveBeenCalled();
    mockRpc.mockResolvedValueOnce({
      data: {
        ...report,
        status: "resolved",
        resolution_note: "Reviewed the unsafe notice.",
      },
      error: null,
    });
    await expect(
      adminGateway.resolveReport(
        report.id,
        "resolved",
        "  Reviewed the unsafe notice.  ",
      ),
    ).resolves.toMatchObject({
      status: "resolved",
      resolutionNote: "Reviewed the unsafe notice.",
    });
    expect(mockRpc).toHaveBeenCalledWith("resolve_report", {
      p_report_id: report.id,
      p_decision: "resolved",
      p_resolution_note: "Reviewed the unsafe notice.",
    });
  });
});
