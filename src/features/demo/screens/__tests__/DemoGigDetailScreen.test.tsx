import { fireEvent, render } from "@testing-library/react-native";

import { createDemoSeed } from "../../data/demo-seed";
import { DemoGigDetailScreen } from "../DemoGigDetailScreen";

const mockApplyToGig = jest.fn(async () => undefined);
const mockPush = jest.fn();
let mockState = { ...createDemoSeed(), activePersona: "worker" as const };

jest.mock("@/features/demo/context/useDemo", () => ({
  useDemo: () => ({
    state: mockState,
    busy: false,
    error: null,
    applyToGig: mockApplyToGig,
  }),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

describe("DemoGigDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { ...createDemoSeed(), activePersona: "worker" };
  });

  it("opens an accepted assignment even after applications close", async () => {
    const gig = mockState.gigs[0];
    mockState = {
      ...mockState,
      gigs: [{ ...gig, status: "assigned" }],
      applications: [
        {
          id: "application-1",
          gigId: gig.id,
          workerId: "demo-worker",
          message: "I can complete this work carefully.",
          status: "accepted",
          createdAt: "2026-11-03T00:00:00.000Z",
        },
      ],
      assignments: [
        {
          id: "assignment-1",
          gigId: gig.id,
          employerId: "demo-employer",
          workerId: "demo-worker",
          status: "active",
          submissionNote: null,
          submittedAt: null,
          completedAt: null,
        },
      ],
    };
    const view = await render(<DemoGigDetailScreen gigId={gig.id} />);
    await fireEvent.press(
      view.getByRole("button", { name: "Open assignment" }),
    );
    expect(mockPush).toHaveBeenCalledWith("/(demo)/assignments/assignment-1");
    expect(view.queryByText("Applications are closed")).toBeNull();
  });

  it("shows gig terms and validates the application message", async () => {
    const gig = createDemoSeed().gigs[0];
    const view = await render(<DemoGigDetailScreen gigId={gig.id} />);

    expect(view.getByText("PHP 750")).toBeVisible();
    expect(view.getByText("Why this may fit")).toBeVisible();
    await fireEvent.press(
      view.getByRole("button", { name: "Send application" }),
    );
    expect(view.getByText("Write at least 10 characters.")).toBeVisible();
  });

  it("sends one bounded local application", async () => {
    const gig = createDemoSeed().gigs[0];
    const view = await render(<DemoGigDetailScreen gigId={gig.id} />);
    await fireEvent.changeText(
      view.getByLabelText("Message to the employer"),
      "I can handle this delivery carefully.",
    );
    await fireEvent.press(
      view.getByRole("button", { name: "Send application" }),
    );

    expect(mockApplyToGig).toHaveBeenCalledWith(
      gig.id,
      "I can handle this delivery carefully.",
    );
  });
});
