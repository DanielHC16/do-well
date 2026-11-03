import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, Button, Text, View } from "react-native";

import { createDemoSeed, refreshDemoSeedCopy } from "../data/demo-seed";
import { demoRepository, type DemoRepository } from "../data/demo-repository";
import {
  advanceDemoCounterpart,
  type DemoIdKind,
} from "../model/demo-counterpart";
import { transitionDemoState, type DemoAction } from "../model/demo-reducer";
import type { DemoState } from "../model/demo-schema";
import { DEMO_EMPLOYER, DEMO_WORKER } from "../model/demo-state";
import {
  DemoContext,
  type CreateDemoGigInput,
  type DemoContextValue,
} from "./useDemo";

const loadErrorMessage = "Your saved data is unavailable.";
const saveErrorMessage = "Your changes could not be saved. Try again.";

const seedGigIds = new Set(createDemoSeed().gigs.map(({ id }) => id));

type IdKind = DemoIdKind;

type DemoProviderProps = PropsWithChildren<{
  repository?: DemoRepository;
  now?: () => string;
  createId?: (kind: IdKind) => string;
}>;

function defaultNow(): string {
  return new Date().toISOString();
}

let nextLocalId = 0;

function defaultCreateId(kind: IdKind): string {
  nextLocalId += 1;
  return `demo-${kind}-${Date.now()}-${nextLocalId}`;
}

export function DemoProvider({
  children,
  repository = demoRepository,
  now = defaultNow,
  createId = defaultCreateId,
}: DemoProviderProps) {
  const [state, setState] = useState<DemoState | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(true);
  const mountedRef = useRef(true);
  const stateRef = useRef<DemoState | null>(null);

  const replaceState = useCallback((nextState: DemoState) => {
    stateRef.current = nextState;
    if (mountedRef.current) setState(nextState);
  }, []);

  const load = useCallback(async () => {
    busyRef.current = true;
    if (mountedRef.current) {
      setBusy(true);
      setError(null);
    }
    try {
      const result = await repository.load();
      const advanced = advanceDemoCounterpart(
        refreshDemoSeedCopy(result.state),
        {
          createId,
          occurredAt: now(),
          publishedGigIds: result.state.gigs
            .filter(({ id }) => !seedGigIds.has(id))
            .map(({ id }) => id),
        },
      );
      if (!advanced.ok) throw new Error(advanced.error.code);
      if (advanced.state !== result.state)
        await repository.save(advanced.state);
      replaceState(advanced.state);
      if (mountedRef.current) setError(result.recoveryError?.message ?? null);
    } catch {
      stateRef.current = null;
      if (mountedRef.current) {
        setState(null);
        setError(loadErrorMessage);
      }
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  }, [createId, now, replaceState, repository]);

  useEffect(() => {
    mountedRef.current = true;
    // Defer the external-storage synchronization so the effect itself does not
    // synchronously schedule React state updates.
    void Promise.resolve().then(load);
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const execute = useCallback(
    async (action: DemoAction): Promise<boolean> => {
      const current = stateRef.current;
      if (busyRef.current || !current) return false;

      const transitioned = transitionDemoState(current, action);
      const result = transitioned.ok
        ? advanceDemoCounterpart(transitioned.state, {
            createId,
            occurredAt: now(),
            publishedGigIds: transitioned.state.gigs
              .filter(({ id }) => !seedGigIds.has(id))
              .map(({ id }) => id),
          })
        : transitioned;
      if (!result.ok) {
        if (mountedRef.current) setError(result.error.message);
        return false;
      }

      busyRef.current = true;
      if (mountedRef.current) {
        setBusy(true);
        setError(null);
      }
      try {
        await repository.save(result.state);
        replaceState(result.state);
        return true;
      } catch {
        if (mountedRef.current) setError(saveErrorMessage);
        return false;
      } finally {
        busyRef.current = false;
        if (mountedRef.current) setBusy(false);
      }
    },
    [createId, now, replaceState, repository],
  );

  const switchPersona = useCallback(
    (role: "employer" | "worker") =>
      execute({ type: "SET_ACTIVE_PERSONA", persona: role }),
    [execute],
  );

  const createGig = useCallback(
    (input: CreateDemoGigInput) => {
      const occurredAt = now();
      return execute({
        type: "CREATE_GIG",
        actorId: DEMO_EMPLOYER.id,
        gig: {
          id: createId("gig"),
          employerId: DEMO_EMPLOYER.id,
          ...input,
          publicArea: input.workMode === "remote" ? null : input.publicArea,
          status: "published",
          createdAt: occurredAt,
        },
        activityId: createId("activity"),
        occurredAt,
      });
    },
    [createId, execute, now],
  );

  const applyToGig = useCallback(
    (gigId: string, message: string) => {
      const occurredAt = now();
      return execute({
        type: "APPLY_TO_GIG",
        actorId: DEMO_WORKER.id,
        application: {
          id: createId("application"),
          gigId,
          workerId: DEMO_WORKER.id,
          message,
          status: "pending",
          createdAt: occurredAt,
        },
        activityId: createId("activity"),
        occurredAt,
      });
    },
    [createId, execute, now],
  );

  const selectApplication = useCallback(
    async (applicationId: string) => {
      const current = stateRef.current;
      const application = current?.applications.find(
        ({ id }) => id === applicationId,
      );
      const gig = current?.gigs.find(({ id }) => id === application?.gigId);
      if (!application || !gig) {
        if (mountedRef.current) setError("The application does not exist.");
        return false;
      }
      const occurredAt = now();
      return execute({
        type: "SELECT_APPLICATION",
        actorId: DEMO_EMPLOYER.id,
        applicationId,
        assignment: {
          id: createId("assignment"),
          gigId: gig.id,
          employerId: gig.employerId,
          workerId: application.workerId,
          status: "active",
          submissionNote: null,
          submittedAt: null,
          completedAt: null,
        },
        activityId: createId("activity"),
        occurredAt,
      });
    },
    [createId, execute, now],
  );

  const submitAssignment = useCallback(
    (assignmentId: string, note: string) => {
      const submittedAt = now();
      return execute({
        type: "SUBMIT_ASSIGNMENT",
        actorId: DEMO_WORKER.id,
        assignmentId,
        submissionNote: note,
        submittedAt,
        activityId: createId("activity"),
      });
    },
    [createId, execute, now],
  );

  const approveAssignment = useCallback(
    (assignmentId: string) =>
      execute({
        type: "APPROVE_ASSIGNMENT",
        actorId: DEMO_EMPLOYER.id,
        assignmentId,
        completedAt: now(),
        activityId: createId("activity"),
      }),
    [createId, execute, now],
  );

  const reset = useCallback(async () => {
    if (busyRef.current) return false;
    busyRef.current = true;
    if (mountedRef.current) {
      setBusy(true);
      setError(null);
    }
    try {
      replaceState(await repository.reset());
      return true;
    } catch {
      if (mountedRef.current) setError(saveErrorMessage);
      return false;
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  }, [replaceState, repository]);

  if (!state) {
    return (
      <View>
        {busy ? (
          <ActivityIndicator accessibilityLabel="Loading your account" />
        ) : null}
        <Text>{busy ? "Loading your account data..." : loadErrorMessage}</Text>
        {!busy ? (
          <>
            <Button title="Try again" onPress={() => void load()} />
            <Button title="Reset app data" onPress={() => void reset()} />
          </>
        ) : null}
      </View>
    );
  }

  const value: DemoContextValue = {
    state,
    busy,
    error,
    switchPersona,
    createGig,
    applyToGig,
    selectApplication,
    submitAssignment,
    approveAssignment,
    reset,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
