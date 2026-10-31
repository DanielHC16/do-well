import {
  fireEvent,
  render as renderNative,
} from "@testing-library/react-native";
import { useState, type PropsWithChildren, type ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  AISuggestionCard,
  BADGES,
  Donut,
  EmptyState,
  ErrorState,
  GigCard,
  IconButton,
  PrimaryButton,
  ProgressBar,
  SegmentedPills,
  SelectField,
  Skeleton,
  StatTile,
  StatusBadge,
  TagInput,
  TaskCard,
  WeekStrip,
} from "..";

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 640 },
  insets: { top: 24, left: 0, right: 0, bottom: 16 },
};
function Providers({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>{children}</SafeAreaProvider>
  );
}
const render = (ui: ReactElement) => renderNative(ui, { wrapper: Providers });

describe("buttons", () => {
  it("exposes role, label and busy/disabled state and blocks presses", async () => {
    const onPress = jest.fn();
    const view = await render(
      <PrimaryButton label="Post gig" onPress={onPress} loading />,
    );
    const button = view.getByRole("button", { name: "Post gig" });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("announces the unread badge on icon buttons", async () => {
    const view = await render(
      <IconButton
        icon="bell"
        accessibilityLabel="Notifications"
        onPress={jest.fn()}
        badge
      />,
    );
    expect(
      view.getByRole("button", { name: "Notifications, new items" }),
    ).toBeVisible();
  });
});

describe("segmented pills", () => {
  function Harness() {
    const [value, setValue] = useState<"a" | "b" | "c">("a");
    return (
      <SegmentedPills
        accessibilityLabel="Work sections"
        value={value}
        onChange={setValue}
        segments={[
          { value: "a", label: "Applications", count: 2 },
          { value: "b", label: "Active" },
          { value: "c", label: "Completed" },
        ]}
      />
    );
  }

  it("renders tabs with counts and moves selection", async () => {
    const view = await render(<Harness />);
    expect(view.getByRole("tab", { name: "Applications 2" })).toBeSelected();
    await fireEvent.press(view.getByRole("tab", { name: "Active" }));
    expect(view.getByRole("tab", { name: "Active" })).toBeSelected();
    expect(
      view.getByRole("tab", { name: "Applications 2" }),
    ).not.toBeSelected();
  });
});

describe("state components", () => {
  it("renders one kind-specific error surface with a retry action", async () => {
    const onRetry = jest.fn();
    const view = await render(
      <ErrorState
        kind="offline"
        message="We couldn't load your work."
        onRetry={onRetry}
      />,
    );
    expect(view.getByText("You're offline")).toBeVisible();
    expect(view.getByRole("alert")).toHaveTextContent(
      "We couldn't load your work.",
    );
    expect(view.queryByText(/unavailable/i)).toBeNull();
    await fireEvent.press(view.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("hides technical detail behind a dev-only toggle", async () => {
    const view = await render(
      <ErrorState kind="server" detail="PGRST116 no rows" />,
    );
    expect(view.queryByText(/PGRST116/)).toBeNull();
    await fireEvent.press(
      view.getByRole("button", { name: "Show technical detail (dev)" }),
    );
    expect(view.getByText("[server] PGRST116 no rows")).toBeVisible();
  });

  it("offers a primary and secondary action in empty states", async () => {
    const reset = jest.fn();
    const remote = jest.fn();
    const view = await render(
      <EmptyState
        title="No gigs here yet"
        message="Try a wider area or remote work."
        actionLabel="Reset filters"
        onAction={reset}
        secondaryLabel="Try Remote gigs"
        onSecondary={remote}
      />,
    );
    await fireEvent.press(
      view.getByRole("button", { name: "Try Remote gigs" }),
    );
    expect(remote).toHaveBeenCalled();
    expect(
      view.getByRole("header", { name: "No gigs here yet" }),
    ).toBeVisible();
  });

  it("marks skeletons as busy progress for screen readers", async () => {
    const view = await render(<Skeleton label="Loading gigs" count={2} />);
    expect(view.getByLabelText("Loading gigs")).toBeBusy();
  });
});

describe("cards", () => {
  it("shows ₱ pay, approximate place, and server reasons on gig cards", async () => {
    const onPress = jest.fn();
    const view = await render(
      <GigCard
        title="Sort office files"
        amount={1500}
        workMode="onsite"
        area="Poblacion"
        distanceKm={2.14}
        reasons={["Within 5 km of you"]}
        onPress={onPress}
      />,
    );
    expect(view.getByText("₱1,500")).toBeVisible();
    expect(view.getByText("~2.1 km · Poblacion")).toBeVisible();
    expect(view.getByText("Why this fits: Within 5 km of you")).toBeVisible();
    await fireEvent.press(
      view.getByRole("button", { name: /Sort office files, ₱1,500/ }),
    );
    expect(onPress).toHaveBeenCalled();
  });

  it("shows a Remote badge instead of a distance for remote gigs", async () => {
    const view = await render(
      <GigCard
        title="Design a flyer"
        amount={800}
        workMode="remote"
        area={null}
        distanceKm={null}
        onPress={jest.fn()}
      />,
    );
    expect(view.getByLabelText("Status: Remote")).toBeVisible();
    expect(view.queryByText(/km/)).toBeNull();
  });

  it("omits the progress bar when milestone progress is unknown", async () => {
    const view = await render(
      <TaskCard
        title="Inventory count"
        badges={[BADGES.inProgress]}
        dueAt={null}
        progress={null}
        onPress={jest.fn()}
      />,
    );
    expect(view.queryByRole("progressbar")).toBeNull();
    expect(view.getByText("No due date")).toBeVisible();
  });

  it("reports progress values to assistive tech", async () => {
    const view = await render(
      <>
        <ProgressBar value={0.6} label="3 of 5 milestones approved" />
        <Donut value={0.25} label="Weekly milestones" />
      </>,
    );
    expect(
      view.getByRole("progressbar", { name: "3 of 5 milestones approved" }),
    ).toHaveAccessibilityValue({ now: 60 });
    expect(
      view.getByRole("progressbar", { name: "Weekly milestones" }),
    ).toHaveAccessibilityValue({ now: 25 });
  });

  it("renders stat tiles as filter buttons only when tappable", async () => {
    const onPress = jest.fn();
    const view = await render(
      <>
        <StatTile value="4" label="Applied" onPress={onPress} />
        <StatTile value="20+" label="In progress" />
      </>,
    );
    await fireEvent.press(view.getByRole("button", { name: "4 Applied" }));
    expect(onPress).toHaveBeenCalled();
    expect(
      view.getByRole("button", { name: "20+ In progress" }),
    ).toBeDisabled();
  });

  it("labels status badges", async () => {
    const view = await render(<StatusBadge badge={BADGES.revisionRequested} />);
    expect(view.getByLabelText("Status: Revision requested")).toBeVisible();
  });
});

describe("AI suggestion card", () => {
  function Harness({ source }: { source: "ai" | "template" }) {
    const [items, setItems] = useState(["Photo of sorted shelves"]);
    return (
      <AISuggestionCard
        title="Deliverables"
        source={source}
        items={items}
        onChange={setItems}
      />
    );
  }

  it("labels AI content only when it really came from inference", async () => {
    const ai = await render(<Harness source="ai" />);
    expect(
      ai.getByText("Suggested by AI · review before posting"),
    ).toBeVisible();
  });

  it("labels template content as a template, never as AI", async () => {
    const template = await render(<Harness source="template" />);
    expect(template.queryByText(/Suggested by AI/)).toBeNull();
    expect(
      template.getByText("Template suggestion · review before posting"),
    ).toBeVisible();
  });

  it("lets the human edit, remove and add every item", async () => {
    const view = await render(<Harness source="ai" />);
    await fireEvent.changeText(
      view.getByLabelText("Deliverables item 1"),
      "Photo of labelled shelves",
    );
    expect(view.getByDisplayValue("Photo of labelled shelves")).toBeVisible();
    await fireEvent.changeText(
      view.getByLabelText("New Deliverables item"),
      "Inventory sheet",
    );
    await fireEvent.press(
      view.getByRole("button", { name: "Add item to Deliverables" }),
    );
    expect(view.getByDisplayValue("Inventory sheet")).toBeVisible();
    await fireEvent.press(
      view.getByRole("button", { name: "Remove Deliverables item 1" }),
    );
    expect(view.queryByDisplayValue("Photo of labelled shelves")).toBeNull();
  });
});

describe("fields", () => {
  it("selects an option from the select sheet", async () => {
    function Harness() {
      const [value, setValue] = useState<"onsite" | "remote" | null>(null);
      return (
        <SelectField
          label="Work mode"
          value={value}
          onChange={setValue}
          options={[
            { value: "onsite", label: "On-site" },
            { value: "remote", label: "Remote" },
          ]}
        />
      );
    }
    const view = await render(<Harness />);
    await fireEvent.press(
      view.getByRole("button", { name: "Work mode: not set" }),
    );
    await fireEvent.press(view.getByRole("radio", { name: "Remote" }));
    expect(
      view.getByRole("button", { name: "Work mode: Remote" }),
    ).toBeVisible();
  });

  it("adds and removes tags", async () => {
    function Harness() {
      const [tags, setTags] = useState<string[]>([]);
      return <TagInput label="Tags" tags={tags} onChange={setTags} />;
    }
    const view = await render(<Harness />);
    await fireEvent.changeText(view.getByLabelText("Tags"), "Excel");
    await fireEvent.press(view.getByRole("button", { name: "Add Tags" }));
    await fireEvent.press(view.getByRole("button", { name: "Remove Excel" }));
    expect(view.queryByRole("button", { name: "Remove Excel" })).toBeNull();
  });

  it("selects a day on the week strip", async () => {
    const onSelect = jest.fn();
    const view = await render(
      <WeekStrip
        selected={new Date(2026, 9, 28)}
        onSelect={onSelect}
        markedDates={[new Date(2026, 9, 30)]}
      />,
    );
    const tabs = view.getAllByRole("tab");
    expect(tabs).toHaveLength(7);
    expect(view.getByRole("tab", { selected: true })).toBeVisible();
    await fireEvent.press(view.getByRole("tab", { name: /has due work/ }));
    expect(onSelect).toHaveBeenCalledWith(new Date(2026, 9, 30));
  });
});
