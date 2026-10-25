import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { useState } from "react";
import { Pressable, Text } from "react-native";

import type { DemoRepository } from "../../data/demo-repository";
import { DemoStateSchema, type DemoState } from "../../model/demo-schema";
import { DemoProvider } from "../DemoProvider";
import { useDemo } from "../useDemo";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const initialState: DemoState = {
  schemaVersion: 1,
  activePersona: "employer",
  gigs: [],
  applications: [],
  assignments: [],
  activity: [],
};

function Probe() {
  const { busy, error, state, switchPersona } = useDemo();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => void switchPersona("worker")}
    >
      <Text>{`${state.activePersona}:${busy ? "busy" : "idle"}:${error ?? "none"}`}</Text>
    </Pressable>
  );
}

function ResultProbe() {
  const { error, switchPersona } = useDemo();
  const [result, setResult] = useState("pending");
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        void switchPersona("worker").then((saved) => setResult(String(saved)))
      }
    >
      <Text>{`${result}:${error ?? "none"}`}</Text>
    </Pressable>
  );
}

function createRepository() {
  return {
    load: jest.fn().mockResolvedValue({
      state: initialState,
      recoveryError: null,
    }),
    save: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn().mockResolvedValue(initialState),
  };
}

function LifecycleProbe() {
  const demo = useDemo();
  const assignmentStatus = demo.state.assignments[0]?.status ?? "none";

  async function runLifecycle() {
    if (
      !(await demo.createGig({
        title: "Set up the community hall",
        description: "Arrange tables and chairs before the neighborhood event.",
        category: "events",
        workMode: "onsite",
        publicArea: "Makati",
        budgetAmount: 900,
      }))
    )
      return;
    if (!(await demo.switchPersona("worker"))) return;
    if (
      !(await demo.applyToGig(
        "gig-1",
        "I can complete the event setup this afternoon.",
      ))
    )
      return;
    if (!(await demo.switchPersona("employer"))) return;
    if (!(await demo.selectApplication("application-3"))) return;
    if (!(await demo.switchPersona("worker"))) return;
    if (
      !(await demo.submitAssignment(
        "assignment-5",
        "Tables and chairs are arranged and ready for the event.",
      ))
    )
      return;
    if (!(await demo.switchPersona("employer"))) return;
    await demo.approveAssignment("assignment-5");
  }

  return (
    <>
      <Text>{`${demo.state.activePersona}:${demo.state.gigs.length}:${demo.state.applications.length}:${demo.state.assignments.length}:${assignmentStatus}`}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Run lifecycle"
        onPress={() => void runLifecycle()}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset lifecycle"
        onPress={() => void demo.reset()}
      />
    </>
  );
}

function createStatefulRepository() {
  let persisted = initialState;
  const repository: DemoRepository = {
    load: jest.fn(async () => ({
      state: persisted,
      recoveryError: null,
    })),
    save: jest.fn(async (state) => {
      persisted = DemoStateSchema.parse(state);
    }),
    reset: jest.fn(async () => {
      persisted = initialState;
      return persisted;
    }),
  };
  return { repository, getPersisted: () => persisted };
}

describe("DemoProvider", () => {
  it("loads local state before rendering routes and persists successful actions", async () => {
    const repository = createRepository();

    const view = await render(
      <DemoProvider repository={repository}>
        <Probe />
      </DemoProvider>,
    );

    await waitFor(() =>
      expect(view.getByText("employer:idle:none")).toBeVisible(),
    );

    await fireEvent.press(view.getByRole("button"));

    await waitFor(() =>
      expect(view.getByText("worker:idle:none")).toBeVisible(),
    );
    expect(repository.save).toHaveBeenCalledWith({
      ...initialState,
      activePersona: "worker",
    });
  });

  it("suppresses duplicate actions while a save is in progress", async () => {
    let releaseSave: (() => void) | undefined;
    const repository = createRepository();
    repository.save.mockImplementation(
      () => new Promise<void>((resolve) => (releaseSave = resolve)),
    );

    const view = await render(
      <DemoProvider repository={repository}>
        <Probe />
      </DemoProvider>,
    );
    await waitFor(() =>
      expect(view.getByText("employer:idle:none")).toBeVisible(),
    );

    await fireEvent.press(view.getByRole("button"));
    await fireEvent.press(view.getByRole("button"));

    expect(repository.save).toHaveBeenCalledTimes(1);
    await act(async () => releaseSave?.());
    await waitFor(() =>
      expect(view.getByText("worker:idle:none")).toBeVisible(),
    );
  });

  it("returns failure and retains current state when persistence fails", async () => {
    const repository = createRepository();
    repository.save.mockRejectedValueOnce(new Error("private storage detail"));
    const view = await render(
      <DemoProvider repository={repository}>
        <ResultProbe />
      </DemoProvider>,
    );
    await waitFor(() => expect(view.getByText("pending:none")).toBeVisible());

    await fireEvent.press(view.getByRole("button"));

    await waitFor(() =>
      expect(
        view.getByText("false:Local demo data could not be saved. Try again."),
      ).toBeVisible(),
    );
  });

  it("offers retry and reset when storage loading fails", async () => {
    const repository = createRepository();
    repository.load.mockRejectedValueOnce(new Error("private storage detail"));

    const view = await render(
      <DemoProvider repository={repository}>
        <Probe />
      </DemoProvider>,
    );

    await waitFor(() =>
      expect(view.getByText("Local demo data is unavailable.")).toBeVisible(),
    );
    expect(view.queryByText("private storage detail")).toBeNull();

    await fireEvent.press(view.getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(view.getByText("employer:idle:none")).toBeVisible(),
    );
    expect(repository.load).toHaveBeenCalledTimes(2);
  });

  it("persists the complete lifecycle across remount and resets it deterministically", async () => {
    const { repository, getPersisted } = createStatefulRepository();
    let id = 0;
    const createId = (
      kind: "gig" | "application" | "assignment" | "activity",
    ) => `${kind}-${++id}`;
    const times = [
      "2026-10-25T01:00:00.000Z",
      "2026-10-25T01:01:00.000Z",
      "2026-10-25T01:02:00.000Z",
      "2026-10-25T01:03:00.000Z",
      "2026-10-25T01:04:00.000Z",
    ];
    const now = () => times.shift() ?? "2026-10-25T01:05:00.000Z";

    const first = await render(
      <DemoProvider repository={repository} createId={createId} now={now}>
        <LifecycleProbe />
      </DemoProvider>,
    );
    await waitFor(() =>
      expect(first.getByText("employer:0:0:0:none")).toBeVisible(),
    );

    await fireEvent.press(first.getByRole("button", { name: "Run lifecycle" }));
    await waitFor(() =>
      expect(first.getByText("employer:1:1:1:completed")).toBeVisible(),
    );
    expect(getPersisted().activity.map(({ type }) => type)).toEqual([
      "gig_published",
      "application_submitted",
      "worker_selected",
      "work_submitted",
      "work_approved",
    ]);

    await first.unmount();
    const second = await render(
      <DemoProvider repository={repository} createId={createId} now={now}>
        <LifecycleProbe />
      </DemoProvider>,
    );
    await waitFor(() =>
      expect(second.getByText("employer:1:1:1:completed")).toBeVisible(),
    );

    await fireEvent.press(
      second.getByRole("button", { name: "Reset lifecycle" }),
    );
    await waitFor(() =>
      expect(second.getByText("employer:0:0:0:none")).toBeVisible(),
    );
    expect(getPersisted()).toEqual(initialState);
  });
});
