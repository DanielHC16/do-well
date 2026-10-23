import type { AuthChangeEvent as SupabaseAuthChangeEvent } from "@supabase/supabase-js";
import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

import { getSupabaseClient } from "../../../shared/api/supabase";
import { getAuthGateway } from "../data/auth-gateway";
import { createSupabaseProfileGateway } from "../data/profile-gateway";
import { authReducer, initialAuthState } from "../model/auth-reducer";
import { toSafeAuthError } from "../model/auth-errors";
import type { AuthProfile } from "../model/auth-state";
import { restoreSession } from "../services/restore-session";
import {
  profileGateStore,
  type ProfileGateStore,
} from "../../profile/data/profile-gate-store";
import {
  AuthContext,
  type AuthContextValue,
  type ReturnTypeOfAuthGateway,
} from "./useAuth";

type AuthChangeEvent = SupabaseAuthChangeEvent;

type ProfileGateway = Readonly<{
  getOwnProfile: (userId: string) => Promise<AuthProfile | null>;
  ensureProfile: () => Promise<AuthProfile | null>;
  completeOnboarding: (
    displayName: string,
    homeArea: string,
  ) => Promise<AuthProfile | null>;
}>;

export type AuthProviderDependencies = Readonly<{
  auth: ReturnTypeOfAuthGateway;
  profiles: ProfileGateway;
  profileGate: ProfileGateStore;
  subscribe: (
    listener: (event: AuthChangeEvent, userId: string | null) => void,
  ) => () => void;
}>;

function createDefaultDependencies(): AuthProviderDependencies {
  const client = getSupabaseClient();
  return {
    auth: getAuthGateway(),
    profiles: createSupabaseProfileGateway(),
    profileGate: profileGateStore,
    subscribe: (listener) => {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        // Supabase warns against awaiting client calls inside this callback.
        queueMicrotask(() => listener(event, session?.user.id ?? null));
      });
      return () => data.subscription.unsubscribe();
    },
  };
}

type AuthProviderProps = PropsWithChildren<{
  dependencies?: AuthProviderDependencies;
}>;

export function AuthProvider({ children, dependencies }: AuthProviderProps) {
  const deps = useMemo(
    () => dependencies ?? createDefaultDependencies(),
    [dependencies],
  );
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const operation = useRef(0);
  const mounted = useRef(true);
  const activeUserId = useRef<string | null>(null);
  const establishedRoute = useRef<"needsOnboarding" | "ready" | null>(null);

  const nextOperation = useCallback((): number => {
    operation.current += 1;
    return operation.current;
  }, []);

  const restore = useCallback(
    async (knownUserId?: string | null): Promise<void> => {
      const operationId = nextOperation();
      const previousUserId = activeUserId.current;
      if (knownUserId && previousUserId && knownUserId !== previousUserId) {
        try {
          await deps.profileGate.remove(previousUserId);
        } catch {
          // App-owned cache cleanup is best-effort and never grants access.
        }
      }
      await restoreSession({
        auth: deps.auth,
        profiles: deps.profiles,
        operationId,
        dispatch: (event) => {
          if (mounted.current) dispatch(event);
        },
        isCurrentOperation: () => operation.current === operationId,
        saveProfileGate: deps.profileGate.save,
        removeProfileGate: deps.profileGate.remove,
        knownUserId,
      });
    },
    [deps, nextOperation],
  );

  useEffect(() => {
    activeUserId.current = state.userId;
    establishedRoute.current =
      state.route === "ready" || state.route === "needsOnboarding"
        ? state.route
        : null;
  }, [state.route, state.userId]);

  const validateEstablishedSession = useCallback(async (): Promise<void> => {
    const userId = activeUserId.current;
    if (!userId || establishedRoute.current === null) return;

    const operationId = nextOperation();
    dispatch({ type: "VALIDATION_STARTED", operationId, userId });
    try {
      const user = await deps.auth.getUser();
      if (!mounted.current || operation.current !== operationId) return;
      if (!user) {
        try {
          await deps.profileGate.remove(userId);
        } catch {
          // Revocation remains authoritative if cache cleanup fails.
        }
        dispatch({ type: "SESSION_REVOKED", operationId, userId });
        return;
      }
      if (user.id !== userId) {
        try {
          await deps.profileGate.remove(userId);
        } catch {
          // The new authoritative identity still restores independently.
        }
        if (operation.current === operationId) await restore(user.id);
        return;
      }
      dispatch({ type: "SESSION_VALIDATED", operationId, userId });
    } catch (error) {
      if (!mounted.current || operation.current !== operationId) return;
      const safeError = toSafeAuthError(error);
      if (safeError.code === "AUTH_NETWORK_UNAVAILABLE") {
        dispatch({ type: "NETWORK_UNAVAILABLE", operationId, userId });
        return;
      }
      if (safeError.code === "AUTH_SESSION_EXPIRED") {
        try {
          await deps.profileGate.remove(userId);
        } catch {
          // Revocation remains authoritative if cache cleanup fails.
        }
        dispatch({ type: "SESSION_REVOKED", operationId, userId });
        return;
      }
      dispatch({ type: "VALIDATION_FAILED", operationId, userId });
    }
  }, [deps, nextOperation, restore]);

  useEffect(() => {
    mounted.current = true;
    void restore();

    const unsubscribe = deps.subscribe((event, userId) => {
      void Promise.resolve().then(async () => {
        if (!mounted.current || event === "INITIAL_SESSION") return;
        if (event === "SIGNED_OUT") {
          const previousUserId = activeUserId.current;
          const operationId = nextOperation();
          dispatch({ type: "SIGN_OUT_STARTED", operationId });
          if (previousUserId) {
            try {
              await deps.profileGate.remove(previousUserId);
            } catch {
              // Local routing must still clear when app-owned cache cleanup fails.
            }
          }
          dispatch({ type: "SIGNED_OUT", operationId });
          return;
        }
        if (userId) void restore(userId);
      });
    });

    const updateRefresh = (
      nextState: AppStateStatus | string | null | undefined,
    ) => {
      if (nextState === "active") {
        void deps.auth.startAutoRefresh().catch(() => undefined);
        void validateEstablishedSession();
      } else {
        void deps.auth.stopAutoRefresh().catch(() => undefined);
      }
    };
    updateRefresh(AppState.currentState);
    const appStateSubscription = AppState.addEventListener(
      "change",
      updateRefresh,
    );

    return () => {
      mounted.current = false;
      nextOperation();
      unsubscribe();
      appStateSubscription?.remove();
      void deps.auth.stopAutoRefresh();
    };
  }, [deps, nextOperation, restore, validateEstablishedSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      signUp: async (email, password, displayName) => {
        const operationId = nextOperation();
        dispatch({ type: "SIGN_IN_STARTED", operationId });
        const result = await deps.auth.signUp(email, password, displayName);
        if (
          operation.current === operationId &&
          result.user &&
          result.session
        ) {
          await restore(result.user.id);
        }
      },
      signInWithPassword: async (email, password) => {
        const operationId = nextOperation();
        dispatch({ type: "SIGN_IN_STARTED", operationId });
        const result = await deps.auth.signInWithPassword(email, password);
        if (
          operation.current === operationId &&
          result.user &&
          result.session
        ) {
          await restore(result.user.id);
        }
      },
      beginGoogleSignIn: deps.auth.beginGoogleSignIn,
      exchangeCode: async (code, flowId) => {
        const operationId = nextOperation();
        dispatch({ type: "SIGN_IN_STARTED", operationId });
        const result = await deps.auth.exchangeCode(code, flowId);
        if (operation.current === operationId) {
          await restore(result.user?.id ?? null);
        }
      },
      resendConfirmation: deps.auth.resendConfirmation,
      requestPasswordReset: deps.auth.requestPasswordReset,
      updatePassword: deps.auth.updatePassword,
      completeOnboarding: async (displayName, homeArea) => {
        const userId = state.userId;
        if (!userId) throw new Error("An authenticated user is required.");
        const startingOperation = operation.current;
        await deps.profiles.completeOnboarding(displayName, homeArea);
        if (operation.current !== startingOperation) return;
        const profile = await deps.profiles.getOwnProfile(userId);
        if (operation.current !== startingOperation) return;
        if (!profile) {
          const operationId = nextOperation();
          dispatch({ type: "ACCOUNT_CHANGED", operationId, userId });
          dispatch({ type: "PROFILE_MISSING", operationId });
          return;
        }
        try {
          await deps.profileGate.save(profile);
        } catch {
          // The authoritative server reload succeeded; cache failure cannot block it.
        }
        if (operation.current !== startingOperation) return;
        const operationId = nextOperation();
        dispatch({ type: "ACCOUNT_CHANGED", operationId, userId });
        dispatch({ type: "ONBOARDING_COMPLETED", operationId, profile });
      },
      refresh: () => restore(state.userId),
      signOut: async () => {
        const operationId = nextOperation();
        const userId = state.userId;
        dispatch({ type: "SIGN_OUT_STARTED", operationId });
        try {
          await deps.auth.signOutLocal();
        } catch {
          // Local state and app-owned cache must still reach signed-out.
        }
        if (userId) {
          try {
            await deps.profileGate.remove(userId);
          } catch {
            // Local sign-out must finish even if app-owned cache cleanup fails.
          }
        }
        dispatch({ type: "SIGNED_OUT", operationId });
      },
    }),
    [deps, nextOperation, restore, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
