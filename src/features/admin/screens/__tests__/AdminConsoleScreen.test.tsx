import { fireEvent, render, waitFor } from "@testing-library/react-native";

import {
  AdminConsoleScreen,
  type AdminConsoleGateway,
  type AdminReport,
} from "../AdminConsoleScreen";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock("@/features/shell/context/useShellMode", () => ({
  useShellMode: () => ({
    mode: "worker",
    busy: false,
    error: null,
    switchMode: jest.fn(async () => true),
    retry: jest.fn(async () => undefined),
  }),
}));

const report: AdminReport = {
  id: "a0000000-0000-4000-8000-000000000001",
  reporterId: "80000000-0000-4000-8000-000000000002",
  subjectProfileId: "80000000-0000-4000-8000-000000000003",
  gigId: "90000000-0000-4000-8000-000000000001",
  assignmentId: null,
  category: "unsafe_work",
  details: "The notice asks applicants to handle unsafe wiring.",
  status: "open",
  resolutionNote: null,
  reviewedBy: null,
  reviewedAt: null,
  createdAt: "2026-10-26T01:00:00.000Z",
};

function createGateway(reports: AdminReport[] = []): AdminConsoleGateway {
  return {
    getAdminOverview: jest.fn(async () => ({
      profiles: 12,
      openReports: reports.length,
      publishedGigs: 7,
      activeAssignments: 3,
    })),
    listAdminReports: jest.fn(async () => reports),
    resolveReport: jest.fn(async (reportId, decision, resolutionNote) => ({
      ...report,
      id: reportId,
      status: decision,
      resolutionNote,
      reviewedBy: "80000000-0000-4000-8000-000000000001",
      reviewedAt: "2026-10-26T02:00:00.000Z",
    })),
  };
}

describe("AdminConsoleScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fails closed for a non-admin capability", async () => {
    const gateway = createGateway([report]);
    const view = await render(
      <AdminConsoleScreen gateway={gateway} isAdmin={false} />,
    );

    expect(view.getByText("Admin access required")).toBeVisible();
    expect(view.getByText(/server-authorized administrators/i)).toBeVisible();
    expect(gateway.getAdminOverview).not.toHaveBeenCalled();
    expect(gateway.listAdminReports).not.toHaveBeenCalled();
  });

  it("renders real overview metrics and an explicit empty queue", async () => {
    const gateway = createGateway();
    const view = await render(<AdminConsoleScreen gateway={gateway} isAdmin />);

    await waitFor(() => {
      expect(view.getByText("12")).toBeVisible();
      expect(view.getByText("7")).toBeVisible();
      expect(view.getByText("3")).toBeVisible();
      expect(view.getByText("No open reports")).toBeVisible();
    });
  });

  it("requires a note and resolves a report through the gateway", async () => {
    const gateway = createGateway([report]);
    const view = await render(<AdminConsoleScreen gateway={gateway} isAdmin />);

    await waitFor(() => {
      expect(view.getByText("UNSAFE WORK")).toBeVisible();
      expect(view.getByText(report.details)).toBeVisible();
    });

    const resolveButton = view.getByRole("button", {
      name: "Resolve report",
    });
    expect(resolveButton.props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(
      view.getByLabelText("Moderation note"),
      "Reviewed the notice and removed unsafe instructions.",
    );
    await fireEvent.press(resolveButton);

    await waitFor(() => {
      expect(gateway.resolveReport).toHaveBeenCalledWith(
        report.id,
        "resolved",
        "Reviewed the notice and removed unsafe instructions.",
      );
      expect(view.getByText("Report resolved.")).toBeVisible();
      expect(view.getByText("No open reports")).toBeVisible();
    });
  });

  it("shows a retry action when the admin data cannot load", async () => {
    const gateway = createGateway();
    jest
      .mocked(gateway.getAdminOverview)
      .mockRejectedValueOnce(new Error("Network unavailable"));
    const view = await render(<AdminConsoleScreen gateway={gateway} isAdmin />);

    await waitFor(() => {
      expect(
        view.getByText(
          "Admin data couldn't be loaded. Check your connection and try again.",
        ),
      ).toBeVisible();
    });

    await fireEvent.press(
      view.getByRole("button", { name: "Retry admin data" }),
    );
    await waitFor(() =>
      expect(gateway.getAdminOverview).toHaveBeenCalledTimes(2),
    );
  });
});
