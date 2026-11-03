import {
  fireEvent,
  render as renderScreen,
  waitFor,
} from "@testing-library/react-native";
import type { ReactElement } from "react";

import { ScopedQueryProvider } from "@/shared/api/ScopedQueryProvider";

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

function render(element: ReactElement) {
  return renderScreen(<ScopedQueryProvider>{element}</ScopedQueryProvider>);
}

function createGateway(reports: AdminReport[] = []): AdminConsoleGateway {
  let remaining = [...reports];
  return {
    getAdminOverview: jest.fn(async () => ({
      profiles: 12,
      openReports: remaining.length,
      publishedGigs: 7,
      activeAssignments: 3,
    })),
    listAdminReports: jest.fn(async () => remaining.slice(0, 20)),
    resolveReport: jest.fn(async (reportId, decision, resolutionNote) => {
      remaining = remaining.filter((item) => item.id !== reportId);
      return {
        ...report,
        id: reportId,
        status: decision,
        resolutionNote,
        reviewedBy: "80000000-0000-4000-8000-000000000001",
        reviewedAt: "2026-10-26T02:00:00.000Z",
      };
    }),
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

  it("keeps moderation actions disabled until the server's ten-character note minimum is met", async () => {
    const gateway = createGateway([report]);
    const view = await render(<AdminConsoleScreen gateway={gateway} isAdmin />);
    await view.findByText(report.details);

    await fireEvent.changeText(
      view.getByLabelText("Moderation note"),
      "Too short",
    );
    expect(view.getByRole("button", { name: "Resolve report" })).toBeDisabled();
    expect(view.getByRole("button", { name: "Dismiss report" })).toBeDisabled();
    expect(gateway.resolveReport).not.toHaveBeenCalled();

    await fireEvent.changeText(
      view.getByLabelText("Moderation note"),
      "Reviewed safely.",
    );
    expect(view.getByRole("button", { name: "Resolve report" })).toBeEnabled();
  });

  it("replenishes the first twenty reports from the server after a moderation decision", async () => {
    const reports = Array.from({ length: 21 }, (_, index) => ({
      ...report,
      id: `a0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      details: `Open report number ${index + 1}`,
    }));
    const gateway = createGateway(reports);
    const view = await render(<AdminConsoleScreen gateway={gateway} isAdmin />);
    expect(await view.findByText("Open report number 20")).toBeVisible();
    expect(view.queryByText("Open report number 21")).toBeNull();

    await fireEvent.changeText(
      view.getAllByLabelText("Moderation note")[0],
      "Reviewed the report safely.",
    );
    await fireEvent.press(
      view.getAllByRole("button", { name: "Resolve report" })[0],
    );

    expect(await view.findByText("Open report number 21")).toBeVisible();
    expect(view.queryByText("No open reports")).toBeNull();
    expect(gateway.listAdminReports).toHaveBeenCalledTimes(2);
    expect(gateway.getAdminOverview).toHaveBeenCalledTimes(2);
  });

  it("keeps a saved decision distinct from a failed queue refresh and retries only the read", async () => {
    const gateway = createGateway([report]);
    jest
      .mocked(gateway.listAdminReports)
      .mockResolvedValueOnce([report])
      .mockRejectedValueOnce(new Error("Offline"));
    const view = await render(<AdminConsoleScreen gateway={gateway} isAdmin />);
    await view.findByText(report.details);
    await fireEvent.changeText(
      view.getByLabelText("Moderation note"),
      "Reviewed and resolved safely.",
    );
    await fireEvent.press(view.getByRole("button", { name: "Resolve report" }));

    expect(
      await view.findByText(
        "Report resolved. Refresh the queue before making another decision.",
      ),
    ).toBeVisible();
    expect(view.queryByText("No open reports")).toBeNull();
    expect(view.queryByRole("button", { name: "Resolve report" })).toBeNull();
    await fireEvent.press(
      view.getByRole("button", { name: "Retry admin data" }),
    );
    expect(await view.findByText("No open reports")).toBeVisible();
    expect(gateway.resolveReport).toHaveBeenCalledTimes(1);
  });

  it("retains the queue when the server denies a moderation decision", async () => {
    const gateway = createGateway([report]);
    jest
      .mocked(gateway.resolveReport)
      .mockRejectedValueOnce(new Error("Administrator capability required."));
    const view = await render(<AdminConsoleScreen gateway={gateway} isAdmin />);
    await view.findByText(report.details);
    await fireEvent.changeText(
      view.getByLabelText("Moderation note"),
      "Reviewed and resolved safely.",
    );
    await fireEvent.press(view.getByRole("button", { name: "Resolve report" }));

    expect(
      await view.findByText(
        "The moderation decision couldn't be saved. Try again.",
      ),
    ).toBeVisible();
    expect(view.getByText(report.details)).toBeVisible();
    expect(view.queryByText("No open reports")).toBeNull();
    expect(gateway.listAdminReports).toHaveBeenCalledTimes(1);
  });
});
