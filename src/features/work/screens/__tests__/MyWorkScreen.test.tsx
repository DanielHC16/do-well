import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import type { MilestoneRecord } from "@/features/assignments/model/assignment-schemas";
import type { CacheStore } from "@/shared/persistence/cache-store";

import { MyWorkScreen } from "../MyWorkScreen";
import type { WorkItem } from "../../data/work-gateway";
import {
  clearAssignmentInsights,
  type InsightSource,
} from "../../data/work-insights";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import("react")>("react");
    React.useEffect(effect, [effect]);
  },
}));
jest.mock("@/shared/api/supabase", () => ({ getSupabaseClient: jest.fn() }));
jest.mock("@/features/shell/components/MarketplaceShell", () => ({
  MarketplaceShell: ({
    listContent,
  }: {
    listContent: (notices: null, hero: null) => React.ReactNode;
  }) => listContent(null, null),
}));

function noCache(): CacheStore {
  return {
    get: jest.fn(async () => null),
    set: jest.fn(async () => {
      throw new Error("unused");
    }),
    remove: jest.fn(),
    purgeUser: jest.fn(),
    clearAll: jest.fn(),
  };
}

const ASSIGNMENT = "11111111-1111-4111-8111-111111111111";
const GIG = "22222222-2222-4222-8222-222222222222";

function assignment(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: ASSIGNMENT,
    gigId: GIG,
    title: "Inventory count",
    status: "active",
    amount: 500,
    dueAt: null,
    kind: "assignment",
    ...overrides,
  };
}

function milestone(
  status: MilestoneRecord["status"],
  dueAt: string | null = null,
): MilestoneRecord {
  return {
    id: "33333333-3333-4333-8333-33333333333" + (status.length % 10),
    assignmentId: ASSIGNMENT,
    position: 1,
    title: "Step",
    description: null,
    dueAt,
    status,
    approvedAt: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  };
}

function insightSource(
  milestones: MilestoneRecord[],
  counterpart = "Bea Cruz",
): InsightSource {
  return {
    listMilestones: jest.fn(async () => milestones),
    getAssignmentDetail: jest.fn(
      async () =>
        ({
          employer: {
            id: ASSIGNMENT,
            displayName: counterpart,
            homeArea: null,
          },
          worker: { id: GIG, displayName: counterpart, homeArea: null },
        }) as never,
    ),
  };
}

describe("My Work", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAssignmentInsights();
  });

  it("shows a loading skeleton, then a compact empty state, with no load counters", async () => {
    let finish: () => void = () => undefined;
    const pending = new Promise<WorkItem[]>((resolve) => {
      finish = () => resolve([]);
    });
    const gateway = { list: jest.fn(() => pending) };
    const view = await render(
      <MyWorkScreen
        userId="user"
        mode="worker"
        gateway={gateway}
        cache={noCache()}
      />,
    );
    expect(view.getByLabelText("Loading your work")).toBeBusy();
    expect(view.queryByText(/loaded/)).toBeNull();
    expect(view.queryByRole("button", { name: "Refresh work" })).toBeNull();
    await act(async () => finish());
    expect(await view.findByText("No applications yet")).toBeVisible();
    expect(view.getByRole("button", { name: "Discover gigs" })).toBeVisible();
  });

  it("pages active work and refreshes from the first page on pull", async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) =>
      assignment({
        id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
        title: `Active task ${index}`,
      }),
    );
    const gateway = {
      list: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce([
          assignment({
            id: "00000000-0000-4000-8000-000000000099",
            title: "Another task",
          }),
        ])
        .mockResolvedValueOnce([]),
    };
    const view = await render(
      <MyWorkScreen
        userId="user"
        mode="worker"
        gateway={gateway}
        cache={noCache()}
        insights={insightSource([])}
      />,
    );
    await view.findByText("No applications yet");
    await fireEvent.press(view.getByRole("tab", { name: "Active" }));
    await view.findByText("Active task 0");
    await fireEvent.press(view.getByRole("button", { name: "Load more work" }));
    await waitFor(() =>
      expect(gateway.list).toHaveBeenLastCalledWith(
        "user",
        "worker",
        "active",
        20,
      ),
    );
    // Rows past the first window are virtualized; check the appended data.
    await waitFor(() =>
      expect(view.getByTestId("work-list").props.data).toHaveLength(21),
    );
    await act(async () =>
      view.getByTestId("work-list").props.refreshControl.props.onRefresh(),
    );
    expect(await view.findByText("No active work yet")).toBeVisible();
    expect(gateway.list).toHaveBeenLastCalledWith(
      "user",
      "worker",
      "active",
      0,
    );
  });

  it("shows real application status on a task card and opens its gig", async () => {
    const gateway = {
      list: jest.fn(async () => [
        {
          id: "app",
          gigId: "gig",
          title: "Poster design",
          status: "pending",
          amount: 800,
          dueAt: null,
          kind: "application" as const,
        },
      ]),
    };
    const view = await render(
      <MyWorkScreen
        userId="user"
        mode="worker"
        gateway={gateway}
        cache={noCache()}
      />,
    );
    const card = await view.findByRole("button", { name: /^Poster design/ });
    expect(card.props.accessibilityLabel).toContain("Applied");
    expect(card.props.accessibilityLabel).toContain("₱800");
    // Applications have no milestones, so no invented progress bar.
    expect(view.queryByRole("progressbar")).toBeNull();
    await fireEvent.press(card);
    expect(mockPush).toHaveBeenCalledWith("/(protected)/worker/gigs/gig");
  });

  it("shows one retryable error surface without presenting an empty success", async () => {
    const gateway = {
      list: jest
        .fn()
        .mockRejectedValueOnce(new Error("private detail"))
        .mockResolvedValueOnce([]),
    };
    const view = await render(
      <MyWorkScreen
        userId="user"
        mode="worker"
        gateway={gateway}
        cache={noCache()}
      />,
    );
    expect(
      await view.findByText("We couldn't load your work. Try again."),
    ).toBeVisible();
    expect(view.queryByText(/unavailable/)).toBeNull();
    expect(view.queryByText("No applications yet")).toBeNull();
    expect(view.queryByText("private detail")).toBeNull();
    await fireEvent.press(view.getByRole("button", { name: "Try again" }));
    expect(await view.findByText("No applications yet")).toBeVisible();
  });

  it("opens a deep-linked section and shows real milestone progress with the counterpart", async () => {
    const gateway = { list: jest.fn(async () => [assignment()]) };
    const view = await render(
      <MyWorkScreen
        userId="user"
        mode="worker"
        initialSection="active"
        gateway={gateway}
        cache={noCache()}
        insights={insightSource([
          milestone("approved"),
          milestone("submitted"),
          milestone("pending"),
        ])}
      />,
    );
    expect(view.getByRole("tab", { name: "Active" })).toBeSelected();
    expect(gateway.list).toHaveBeenCalledWith("user", "worker", "active", 0);
    expect(
      await view.findByRole("progressbar", {
        name: "1 of 3 milestones approved",
      }),
    ).toHaveAccessibilityValue({ now: 33 });
    expect(view.getByLabelText("1 people: Bea Cruz")).toBeVisible();
    await fireEvent.press(
      view.getByRole("button", { name: /^Inventory count/ }),
    );
    expect(mockPush).toHaveBeenCalledWith(
      `/(protected)/worker/assignments/${ASSIGNMENT}`,
    );
  });

  it("summarizes this week's milestones for employers in the navy hero card", async () => {
    const dueThisWeek = new Date().toISOString();
    const gateway = { list: jest.fn(async () => [assignment()]) };
    const view = await render(
      <MyWorkScreen
        userId="user"
        mode="employer"
        gateway={gateway}
        cache={noCache()}
        insights={insightSource([
          milestone("approved", dueThisWeek),
          milestone("submitted", dueThisWeek),
        ])}
      />,
    );
    expect(view.getByRole("tab", { name: "Posted" })).toBeSelected();
    expect(
      await view.findByRole("progressbar", {
        name: "1 of 2 milestones due this week approved",
      }),
    ).toHaveAccessibilityValue({ now: 50 });
    expect(view.getByLabelText("1 To review")).toBeVisible();
  });

  it("falls back to the saved first page when offline and labels it", async () => {
    const saved: CacheStore = {
      ...noCache(),
      get: jest.fn(async () => ({
        data: [assignment({ title: "Saved task" })],
        cachedAt: "2026-10-31T07:34:00.000Z",
        userId: "user",
        key: "work:worker:applications",
        version: 1,
        byteSize: 1,
      })) as CacheStore["get"],
    };
    const gateway = {
      list: jest
        .fn()
        .mockRejectedValue(new TypeError("Network request failed")),
    };
    const view = await render(
      <MyWorkScreen
        userId="user"
        mode="worker"
        gateway={gateway}
        cache={saved}
        insights={insightSource([])}
      />,
    );
    expect(await view.findByText("Saved task")).toBeVisible();
    expect(view.getByLabelText(/You may be offline/)).toBeVisible();
    expect(view.queryByRole("button", { name: "Load more work" })).toBeNull();
  });
});
