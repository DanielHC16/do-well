import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";

import { MyReportsScreen } from "../MyReportsScreen";
import type { ReportGateway } from "../../data/report-gateway";
import type { Report } from "../../model/report-schemas";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

describe("MyReportsScreen", () => {
  afterEach(async () => cleanup());

  const sampleReport: Report = {
    id: "r-001",
    reporterId: "u-001",
    category: "scam",
    details: "Employer asked for an advance payment before providing tools.",
    status: "open",
    subjectProfileId: null,
    gigId: "g-001",
    assignmentId: null,
    clientRequestId: "c-001",
    createdAt: "2026-10-26T00:00:00Z",
    updatedAt: "2026-10-26T00:00:00Z",
    reviewedBy: null,
    reviewedAt: null,
  };

  it("renders report items and status badge", async () => {
    const fakeGateway: ReportGateway = {
      submitReport: jest.fn(),
      listMyReports: jest.fn().mockResolvedValue([sampleReport]),
    };

    const view = await render(<MyReportsScreen gateway={fakeGateway} />);

    await waitFor(() => {
      expect(view.getByText("My filed reports")).toBeTruthy();
      expect(view.getByText("Scam or fraudulent activity")).toBeTruthy();
      expect(view.getByText("In queue")).toBeTruthy();
      expect(
        view.getByText(
          "Employer asked for an advance payment before providing tools.",
        ),
      ).toBeTruthy();
    });
  });

  it("renders empty state when user has no reports", async () => {
    const fakeGateway: ReportGateway = {
      submitReport: jest.fn(),
      listMyReports: jest.fn().mockResolvedValue([]),
    };

    const view = await render(<MyReportsScreen gateway={fakeGateway} />);

    await waitFor(() => {
      expect(view.getByText("No reports filed")).toBeTruthy();
      expect(
        view.getByText("You have not submitted any issue reports."),
      ).toBeTruthy();
    });
  });

  it("renders error state with retry on failure", async () => {
    const mockList = jest
      .fn()
      .mockRejectedValueOnce(new Error("Network connection error"))
      .mockResolvedValueOnce([sampleReport]);

    const fakeGateway: ReportGateway = {
      submitReport: jest.fn(),
      listMyReports: mockList,
    };

    const view = await render(<MyReportsScreen gateway={fakeGateway} />);

    await waitFor(() => {
      expect(view.getByText("Failed to load reports.")).toBeTruthy();
    });

    await fireEvent.press(view.getByText("Try again"));

    await waitFor(() => {
      expect(view.getByText("Scam or fraudulent activity")).toBeTruthy();
    });
  });
});
