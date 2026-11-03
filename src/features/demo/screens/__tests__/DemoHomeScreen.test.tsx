import { fireEvent, render } from "@testing-library/react-native";

import { DemoHomeScreen } from "../DemoHomeScreen";
import type { DemoState } from "../../model/demo-schema";

const mockSwitchPersona = jest.fn(async () => undefined);
const mockReset = jest.fn(async () => undefined);
const mockPush = jest.fn();
let mockDemoState: DemoState = {
  schemaVersion: 1,
  activePersona: "employer",
  gigs: [],
  applications: [],
  assignments: [],
  activity: [],
};

jest.mock("@/features/demo/context/useDemo", () => ({
  useDemo: () => ({
    state: mockDemoState,
    busy: false,
    error: null,
    switchPersona: mockSwitchPersona,
    reset: mockReset,
  }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("DemoHomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDemoState = {
      schemaVersion: 1,
      activePersona: "employer",
      gigs: [],
      applications: [],
      assignments: [],
      activity: [],
    };
  });

  it("keeps account switching in Settings and removes presentation disclaimers", async () => {
    const view = await render(<DemoHomeScreen />);
    expect(view.queryAllByRole("radio")).toHaveLength(0);
    expect(
      view.queryByText(
        /DEMO MODE|THE DEMO ROUTE|The flow is real|fictional people/i,
      ),
    ).toBeNull();
    await fireEvent.press(view.getByRole("button", { name: "Settings" }));
    expect(mockPush).toHaveBeenCalledWith("/(demo)/settings");
    expect(mockSwitchPersona).not.toHaveBeenCalled();
  });

  it("shows a useful empty state", async () => {
    const view = await render(<DemoHomeScreen />);

    expect(view.getByText("No gigs yet")).toBeVisible();
    expect(
      view.getAllByRole("button", { name: "Create and publish a gig" })[0],
    ).toBeVisible();
  });

  it("keeps an accepted assignment reachable from the worker home", async () => {
    mockDemoState = {
      schemaVersion: 1,
      activePersona: "worker",
      gigs: [
        {
          id: "gig-1",
          employerId: "demo-employer",
          title: "Set up a neighborhood event",
          description: "Arrange chairs and signs before the community event.",
          category: "events",
          workMode: "onsite",
          publicArea: "Makati",
          budgetAmount: 900,
          status: "assigned",
          createdAt: "2026-10-25T00:00:00.000Z",
        },
      ],
      applications: [],
      assignments: [
        {
          id: "assignment-1",
          gigId: "gig-1",
          employerId: "demo-employer",
          workerId: "demo-worker",
          status: "active",
          submissionNote: null,
          submittedAt: null,
          completedAt: null,
        },
      ],
      activity: [],
    };
    const view = await render(<DemoHomeScreen />);

    await fireEvent.press(
      view.getByRole("button", {
        name: "Open assignment for Set up a neighborhood event",
      }),
    );

    expect(mockPush).toHaveBeenCalledWith("/(demo)/assignments/assignment-1");
  });
});
