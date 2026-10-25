import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";

import { CreateReportScreen } from "../CreateReportScreen";
import type { ReportGateway } from "../../data/report-gateway";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

describe("CreateReportScreen", () => {
  const mockSubmit = jest.fn();
  const fakeGateway: ReportGateway = {
    submitReport: mockSubmit,
    listMyReports: jest.fn(),
  };

  afterEach(async () => cleanup());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders report categories and target details", async () => {
    const view = await render(
      <CreateReportScreen
        gateway={fakeGateway}
        targetId="a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d"
        targetTitle="Fix leaking kitchen faucet"
        targetType="gig"
      />,
    );

    expect(view.getByText("Report an issue")).toBeTruthy();
    expect(view.getByText(/Fix leaking kitchen faucet/)).toBeTruthy();
    expect(view.getByText("Scam or fraudulent activity")).toBeTruthy();
    expect(view.getByText("Unsafe working conditions")).toBeTruthy();
  });

  it("shows validation error if details are fewer than 20 characters", async () => {
    const view = await render(
      <CreateReportScreen
        gateway={fakeGateway}
        targetId="a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d"
        targetType="gig"
      />,
    );

    const input = view.getByPlaceholderText(
      "Explain clearly what happened (minimum 20 characters)...",
    );
    await fireEvent.changeText(input, "Too short");
    await fireEvent.press(view.getByText("Submit report"));

    await waitFor(() => {
      expect(
        view.getByText(
          "Please provide at least 20 characters explaining the issue.",
        ),
      ).toBeTruthy();
    });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("submits report with valid category and details", async () => {
    mockSubmit.mockResolvedValueOnce({
      id: "r1",
      category: "scam",
      details:
        "This employer asked for advance money before providing any tools.",
      status: "open",
    });

    const view = await render(
      <CreateReportScreen
        gateway={fakeGateway}
        targetId="a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d"
        targetType="gig"
      />,
    );

    const input = view.getByPlaceholderText(
      "Explain clearly what happened (minimum 20 characters)...",
    );
    await fireEvent.changeText(
      input,
      "This employer asked for advance money before providing any tools.",
    );
    await fireEvent.press(view.getByText("Submit report"));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "scam",
          details:
            "This employer asked for advance money before providing any tools.",
          gigId: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
        }),
      );
      expect(view.getByText("Report submitted")).toBeTruthy();
    });
  });
});
