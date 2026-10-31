import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { MyWorkScreen } from "../MyWorkScreen";
import type { WorkItem } from "../../data/work-gateway";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import("react")>("react");
    React.useEffect(effect, [effect]);
  },
}));
jest.mock("@/features/shell/components/MarketplaceShell", () => ({
  MarketplaceShell: ({
    listContent,
  }: {
    listContent: (heading: null) => React.ReactNode;
  }) => listContent(null),
  marketplaceStyles: { card: {} },
}));
jest.mock("@/shared/api/supabase", () => ({ getSupabaseClient: jest.fn() }));

describe("My Work", () => {
  it("keeps counts unknown until work has loaded and disables refresh while pending", async () => {
    let finish: () => void = () => undefined;
    const pending = new Promise<WorkItem[]>((resolve) => {
      finish = () => resolve([]);
    });
    const gateway = { list: jest.fn(() => pending) };
    const view = await render(
      <MyWorkScreen userId="user" mode="worker" gateway={gateway} />,
    );
    expect(view.getByText("Loading applications…")).toBeVisible();
    expect(view.queryByText("0 applications loaded")).toBeNull();
    expect(view.getByRole("button", { name: "Refresh work" })).toBeDisabled();
    finish();
    expect(await view.findByText("0 applications loaded")).toBeVisible();
    expect(view.getByText("No applications yet")).toBeVisible();
  });
  it("refreshes from the first page and removes work that has left the active list", async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) => ({
      id: `assignment-${index}`,
      gigId: `gig-${index}`,
      title: `Active task ${index}`,
      status: "active",
      amount: 500,
      dueAt: null,
      kind: "assignment" as const,
    }));
    const gateway = {
      list: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce([
          { ...firstPage[0], id: "assignment-21", title: "Another task" },
        ])
        .mockResolvedValueOnce([]),
    };
    const view = await render(
      <MyWorkScreen userId="user" mode="worker" gateway={gateway} />,
    );
    await view.findByText("No applications yet");
    await fireEvent.press(view.getByRole("button", { name: "Active work" }));
    await view.findByText("Active task 0");
    expect(view.getByText("20 active assignments loaded")).toBeVisible();
    await fireEvent.press(view.getByRole("button", { name: "Load more work" }));
    await waitFor(() =>
      expect(gateway.list).toHaveBeenLastCalledWith(
        "user",
        "worker",
        "active",
        20,
      ),
    );
    await view.findByText("21 active assignments loaded");
    await waitFor(() =>
      expect(
        view.getByRole("button", { name: "Refresh work" }),
      ).not.toBeDisabled(),
    );
    await fireEvent.press(view.getByRole("button", { name: "Refresh work" }));
    expect(await view.findByText("No active work yet")).toBeVisible();
    expect(view.queryByText("Active task 0")).toBeNull();
    expect(gateway.list).toHaveBeenLastCalledWith(
      "user",
      "worker",
      "active",
      0,
    );
  });
  it("shows real application status and opens its gig", async () => {
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
      <MyWorkScreen userId="user" mode="worker" gateway={gateway} />,
    );
    await view.findByText("Poster design");
    expect(view.getByText("1 application loaded")).toBeVisible();
    expect(view.getByText("Pending")).toBeVisible();
    expect(
      view.getByRole("button", { name: /^Open Poster design/ }).props
        .accessibilityLabel,
    ).toContain("Pending. ₱800.00");
    await fireEvent.press(
      view.getByRole("button", { name: /^Open Poster design/ }),
    );
    expect(mockPush).toHaveBeenCalledWith("/(protected)/worker/gigs/gig");
  });

  it("shows a retryable error without presenting an empty success", async () => {
    const gateway = {
      list: jest
        .fn()
        .mockRejectedValueOnce(new Error("private detail"))
        .mockResolvedValueOnce([]),
    };
    const view = await render(
      <MyWorkScreen userId="user" mode="worker" gateway={gateway} />,
    );
    expect(
      await view.findByText("We couldn't load your work. Try again."),
    ).toBeVisible();
    expect(view.queryByText("No applications yet")).toBeNull();
    await fireEvent.press(view.getByRole("button", { name: "Try again" }));
    expect(await view.findByText("No applications yet")).toBeVisible();
  });

  it("keeps completed work in its real section and opens the authoritative assignment", async () => {
    const completed: WorkItem = {
      id: "task-1",
      gigId: "gig-1",
      title: "Data tidy-up",
      status: "completed",
      amount: 500,
      dueAt: null,
      kind: "assignment",
    };
    const gateway = {
      list: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([completed]),
    };
    const view = await render(
      <MyWorkScreen userId="user" mode="worker" gateway={gateway} />,
    );
    await view.findByText("No applications yet");
    expect(view.getByTestId("work-section-tabs").props.horizontal).toBe(true);
    expect(
      view.getByTestId("work-section-tabs").props.persistentScrollbar,
    ).toBe(true);
    await fireEvent.press(view.getByRole("button", { name: "Completed" }));
    expect(
      await view.findByText("1 completed assignment loaded"),
    ).toBeVisible();
    expect(
      view.getByRole("button", { name: "Completed" }).props.accessibilityState
        .selected,
    ).toBe(true);
    expect(gateway.list).toHaveBeenLastCalledWith(
      "user",
      "worker",
      "completed",
      0,
    );
    const card = view.getByRole("button", { name: /^Open Data tidy-up/ });
    expect(card.props.accessibilityLabel).toContain("Completed");
    await fireEvent.press(card);
    expect(mockPush).toHaveBeenCalledWith(
      "/(protected)/worker/assignments/task-1",
    );
  });
});
