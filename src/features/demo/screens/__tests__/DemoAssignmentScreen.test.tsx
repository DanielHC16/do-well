import { fireEvent, render } from "@testing-library/react-native";

import { createDemoSeed } from "../../data/demo-seed";
import type { DemoState } from "../../model/demo-schema";
import { DemoAssignmentScreen } from "../DemoAssignmentScreen";

const mockSubmitAssignment = jest.fn(async () => true);
const mockApproveAssignment = jest.fn(async () => true);
let mockState: DemoState;

jest.mock("@/features/demo/context/useDemo", () => ({
  useDemo: () => ({
    state: mockState,
    busy: false,
    error: null,
    submitAssignment: mockSubmitAssignment,
    approveAssignment: mockApproveAssignment,
  }),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

describe("DemoAssignmentScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = {
      ...createDemoSeed(),
      activePersona: "worker",
      assignments: [
        {
          id: "assignment-1",
          gigId: "demo-gig-delivery",
          employerId: "demo-employer",
          workerId: "demo-worker",
          status: "active",
          submissionNote: null,
          submittedAt: null,
          completedAt: null,
        },
      ],
    };
  });

  it("lets the worker submit completed work and keeps Settings accessible", async () => {
    const view = await render(
      <DemoAssignmentScreen assignmentId="assignment-1" />,
    );
    expect(view.getByRole("button", { name: "Settings" })).toBeVisible();
    expect(view.queryByText(/demo|synthetic|preview|presenter/i)).toBeNull();
    await fireEvent.changeText(
      view.getByLabelText("Work note"),
      "Delivered all supplies to the venue.",
    );
    await fireEvent.press(view.getByRole("button", { name: "Submit work" }));
    expect(mockSubmitAssignment).toHaveBeenCalledWith(
      "assignment-1",
      "Delivered all supplies to the venue.",
    );
  });

  it("lets the employer approve submitted work", async () => {
    mockState.activePersona = "employer";
    mockState.assignments[0] = {
      ...mockState.assignments[0],
      status: "submitted",
      submissionNote: "Work has been completed for review.",
      submittedAt: "2026-11-03T00:00:00.000Z",
    };
    const view = await render(
      <DemoAssignmentScreen assignmentId="assignment-1" />,
    );
    await fireEvent.press(
      view.getByRole("button", { name: "Approve completed work" }),
    );
    expect(mockApproveAssignment).toHaveBeenCalledWith("assignment-1");
    expect(view.getByText("Work has been completed for review.")).toBeVisible();
  });

  it("shows completion without dead-end controls or disclaimers", async () => {
    mockState.assignments[0] = {
      ...mockState.assignments[0],
      status: "completed",
      completedAt: "2026-11-03T00:00:00.000Z",
    };
    const view = await render(
      <DemoAssignmentScreen assignmentId="assignment-1" />,
    );
    expect(view.getByText("Work completed")).toBeVisible();
    expect(view.queryByRole("button", { name: "Submit work" })).toBeNull();
    expect(
      view.queryByRole("button", { name: "Approve completed work" }),
    ).toBeNull();
    expect(view.queryByText(/demo|synthetic|preview|presenter/i)).toBeNull();
    expect(view.getByRole("button", { name: "Home" })).toBeVisible();
  });
});
