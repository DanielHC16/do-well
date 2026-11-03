import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";

import type { DemoRepository } from "../../data/demo-repository";
import { createDemoSeed } from "../../data/demo-seed";
import type { DemoContextValue } from "../useDemo";
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
    if (!(await demo.selectApplication("application-3"))) return;
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

function createStatefulRepository(start: DemoState = initialState) {
  let persisted = start;
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
        view.getByText("false:Your changes could not be saved. Try again."),
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
      expect(view.getByText("Your saved data is unavailable.")).toBeVisible(),
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

describe("automatic counterpart lifecycle", () => {
  async function setup(
    start: DemoState,
    options: { failSave?: boolean; loadFailure?: boolean } = {},
  ) {
    const { repository, getPersisted } = createStatefulRepository(start);
    if (options.failSave) {
      jest
        .mocked(repository.save)
        .mockRejectedValueOnce(new Error("disk full"));
    }
    let captured: DemoContextValue | null = null;
    function Capture() {
      const demo = useDemo();
      useEffect(() => {
        captured = demo;
      }, [demo]);
      return <Text>{demo.busy ? "working" : "ready"}</Text>;
    }
    const view = await render(
      <DemoProvider
        repository={repository}
        now={() => "2026-11-03T12:00:00.000Z"}
      >
        <Capture />
      </DemoProvider>,
    );
    await waitFor(() =>
      expect(
        view.getByText(
          options.loadFailure ? "Your saved data is unavailable." : "ready",
        ),
      ).toBeVisible(),
    );
    function context(): DemoContextValue {
      if (!captured) throw new Error("Provider did not load");
      return captured;
    }
    return { view, context, repository, getPersisted };
  }

  it("gives a new employer post an applicant and completes hiring and review without switching accounts", async () => {
    const { context, getPersisted, repository } = await setup(initialState);
    await act(async () => {
      expect(
        await context().createGig({
          title: "Arrange the event venue",
          description:
            "Set out tables and chairs before the neighborhood event.",
          category: "events",
          workMode: "onsite",
          publicArea: "Makati",
          budgetAmount: 900,
        }),
      ).toBe(true);
    });
    expect(context().state.activePersona).toBe("employer");
    expect(context().state.applications).toHaveLength(1);
    const application = context().state.applications[0];
    if (!application) throw new Error("Expected applicant");
    expect(application.status).toBe("pending");
    expect(context().state.assignments).toHaveLength(0);
    await act(async () => {
      expect(await context().selectApplication(application.id)).toBe(true);
    });
    const assignment = context().state.assignments[0];
    if (!assignment) throw new Error("Expected assignment");
    expect(assignment.status).toBe("submitted");
    expect(assignment.submissionNote).toContain("Arrange the event venue");
    await act(async () => {
      expect(await context().approveAssignment(assignment.id)).toBe(true);
    });
    expect(context().state.assignments[0]?.status).toBe("completed");
    expect(context().state.gigs[0]?.status).toBe("completed");
    expect(context().state.activePersona).toBe("employer");
    expect(getPersisted()).toEqual(context().state);
    expect(repository.save).toHaveBeenCalledTimes(3);
    expect(context().state.activity.map(({ type }) => type)).toEqual([
      "gig_published",
      "application_submitted",
      "worker_selected",
      "work_submitted",
      "work_approved",
    ]);
  });

  it("accepts a worker application and approves their submitted work without switching accounts", async () => {
    const { context, getPersisted, repository } = await setup({
      ...createDemoSeed(),
      activePersona: "worker",
    });
    await act(async () => {
      expect(
        await context().applyToGig(
          "demo-gig-delivery",
          "I can deliver the supplies today.",
        ),
      ).toBe(true);
    });
    expect(context().state.applications[0]?.status).toBe("accepted");
    const assignment = context().state.assignments[0];
    if (!assignment) throw new Error("Expected assignment");
    expect(assignment.status).toBe("active");
    await act(async () => {
      expect(
        await context().submitAssignment(
          assignment.id,
          "Delivered all sealed supplies to the venue.",
        ),
      ).toBe(true);
    });
    expect(context().state.assignments[0]?.status).toBe("completed");
    expect(context().state.gigs[0]?.status).toBe("completed");
    expect(context().state.activePersona).toBe("worker");
    expect(getPersisted()).toEqual(context().state);
    expect(repository.save).toHaveBeenCalledTimes(2);
  });

  it("recovers an existing pending worker application on load and does not duplicate it on remount", async () => {
    const start: DemoState = {
      ...createDemoSeed(),
      activePersona: "worker",
      applications: [
        {
          id: "already-applied",
          gigId: "demo-gig-delivery",
          workerId: "demo-worker",
          message: "I can help with the delivery today.",
          status: "pending",
          createdAt: "2026-11-02T12:00:00.000Z",
        },
      ],
    };
    const first = await setup(start);
    expect(first.context().state.applications[0]?.status).toBe("accepted");
    expect(first.context().state.assignments).toHaveLength(1);
    expect(first.getPersisted()).toEqual(first.context().state);
    const persisted = first.getPersisted();
    await first.view.unmount();
    const second = await setup(persisted);
    expect(second.context().state).toEqual(persisted);
    expect(second.repository.save).not.toHaveBeenCalled();
  });

  it("keeps a failed application and its automatic acceptance out of state until retry saves both", async () => {
    const start = { ...createDemoSeed(), activePersona: "worker" as const };
    const { context, getPersisted, repository } = await setup(start, {
      failSave: true,
    });
    await act(async () => {
      expect(
        await context().applyToGig(
          "demo-gig-delivery",
          "I can deliver the supplies today.",
        ),
      ).toBe(false);
    });
    expect(context().state).toEqual(start);
    expect(getPersisted()).toEqual(start);
    await act(async () => {
      expect(
        await context().applyToGig(
          "demo-gig-delivery",
          "I can deliver the supplies today.",
        ),
      ).toBe(true);
    });
    expect(context().state.applications).toHaveLength(1);
    expect(context().state.applications[0]?.status).toBe("accepted");
    expect(context().state.assignments).toHaveLength(1);
    expect(repository.save).toHaveBeenCalledTimes(2);
  });
  it("recovers old employer posts without claiming built-in gigs and stays idempotent on remount", async () => {
    const seed = createDemoSeed();
    const template = seed.gigs[0];
    if (!template) throw new Error("Expected seed gig");
    const first = await setup({
      ...seed,
      gigs: [
        ...seed.gigs,
        { ...template, id: "old-custom-post", title: "Previously posted job" },
      ],
    });
    expect(first.context().state.applications).toEqual([
      expect.objectContaining({ gigId: "old-custom-post", status: "pending" }),
    ]);
    expect(
      first
        .context()
        .state.gigs.filter(
          ({ id, status }) =>
            id !== "old-custom-post" && status === "published",
        ),
    ).toHaveLength(2);
    const persisted = first.getPersisted();
    await first.view.unmount();
    const second = await setup(persisted);
    expect(second.context().state).toEqual(persisted);
    expect(second.repository.save).not.toHaveBeenCalled();
  });

  it("retries failed recovery without changing the stored pending application", async () => {
    const start: DemoState = {
      ...createDemoSeed(),
      activePersona: "worker",
      applications: [
        {
          id: "pending-before-update",
          gigId: "demo-gig-delivery",
          workerId: "demo-worker",
          message: "I can help with the delivery today.",
          status: "pending",
          createdAt: "2026-11-02T12:00:00.000Z",
        },
      ],
    };
    const { context, getPersisted, view, repository } = await setup(start, {
      failSave: true,
      loadFailure: true,
    });
    expect(getPersisted()).toEqual(start);
    await fireEvent.press(view.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(view.getByText("ready")).toBeVisible());
    expect(context().state.applications[0]?.status).toBe("accepted");
    expect(context().state.assignments).toHaveLength(1);
    expect(repository.save).toHaveBeenCalledTimes(2);
  });

  it("updates only the original built-in description and preserves edited content on remount", async () => {
    const seed = createDemoSeed();
    const original =
      "Clean and organize a synthetic event attendance spreadsheet for review.";
    const first = await setup({
      ...seed,
      gigs: seed.gigs.map((gig) =>
        gig.id === "demo-gig-spreadsheet"
          ? { ...gig, description: original }
          : gig,
      ),
    });
    expect(
      first.context().state.gigs.find(({ id }) => id === "demo-gig-spreadsheet")
        ?.description,
    ).toBe("Clean and organize the event attendance spreadsheet for review.");
    expect(first.repository.save).toHaveBeenCalledTimes(1);
    const persisted = first.getPersisted();
    await first.view.unmount();
    const second = await setup({
      ...persisted,
      gigs: persisted.gigs.map((gig) =>
        gig.id === "demo-gig-spreadsheet"
          ? {
              ...gig,
              description: "My own revised event spreadsheet instructions.",
            }
          : gig,
      ),
    });
    expect(
      second
        .context()
        .state.gigs.find(({ id }) => id === "demo-gig-spreadsheet")
        ?.description,
    ).toBe("My own revised event spreadsheet instructions.");
    expect(second.repository.save).not.toHaveBeenCalled();
  });

  it("recovers an old unclaimed post immediately when switching from worker to employer", async () => {
    const seed = createDemoSeed();
    const template = seed.gigs[0];
    if (!template) throw new Error("Expected seed gig");
    const { context, repository, getPersisted } = await setup({
      ...seed,
      activePersona: "worker",
      gigs: [
        ...seed.gigs,
        {
          ...template,
          id: "old-post-before-switch",
          title: "Unclaimed posted job",
        },
      ],
    });
    expect(context().state.applications).toHaveLength(0);
    expect(repository.save).not.toHaveBeenCalled();
    await act(async () => {
      expect(await context().switchPersona("employer")).toBe(true);
    });
    expect(context().state.activePersona).toBe("employer");
    expect(context().state.applications).toEqual([
      expect.objectContaining({
        gigId: "old-post-before-switch",
        status: "pending",
      }),
    ]);
    expect(
      context().state.gigs.filter(
        ({ id, status }) =>
          id !== "old-post-before-switch" && status === "published",
      ),
    ).toHaveLength(2);
    expect(getPersisted()).toEqual(context().state);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });
});
