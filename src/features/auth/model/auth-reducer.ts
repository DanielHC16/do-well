import { createAuthError } from "./auth-errors";
import {
  initialAuthState,
  type AuthProfile,
  type AuthState,
} from "./auth-state";

export { initialAuthState } from "./auth-state";

type AsyncEvent = Readonly<{ operationId: number }>;

export type AuthEvent =
  | ({ type: "RESTORE_STARTED" } & AsyncEvent)
  | ({ type: "SESSION_FOUND"; userId: string } & AsyncEvent)
  | ({ type: "SESSION_MISSING" } & AsyncEvent)
  | ({ type: "USER_VALIDATED"; userId: string } & AsyncEvent)
  | ({ type: "PROFILE_LOADED"; profile: AuthProfile } & AsyncEvent)
  | ({ type: "PROFILE_MISSING" } & AsyncEvent)
  | ({ type: "SIGN_IN_STARTED" } & AsyncEvent)
  | ({ type: "SIGN_OUT_STARTED" } & AsyncEvent)
  | ({ type: "SIGNED_OUT" } & AsyncEvent)
  | ({ type: "ACCOUNT_CHANGED"; userId: string } & AsyncEvent)
  | Readonly<{ type: "ONBOARDING_COMPLETED"; profile: AuthProfile }>
  | Readonly<{ type: "NETWORK_UNAVAILABLE" }>
  | Readonly<{ type: "SESSION_REVOKED" }>;

function isCurrentOperation(state: AuthState, operationId: number): boolean {
  return state.operationId === operationId;
}

function clearedState(error: AuthState["error"] = null): AuthState {
  return { ...initialAuthState, route: "signedOut", error };
}

export function authReducer(state: AuthState, event: AuthEvent): AuthState {
  switch (event.type) {
    case "RESTORE_STARTED":
      if (isCurrentOperation(state, event.operationId)) return state;
      return {
        ...initialAuthState,
        status: "restoring",
        operationId: event.operationId,
      };
    case "SIGN_IN_STARTED":
      if (isCurrentOperation(state, event.operationId)) return state;
      return {
        ...clearedState(),
        status: "signingIn",
        operationId: event.operationId,
      };
    case "SIGN_OUT_STARTED":
      if (isCurrentOperation(state, event.operationId)) return state;
      return { ...state, status: "signingOut", operationId: event.operationId };
    case "SESSION_FOUND":
      if (!isCurrentOperation(state, event.operationId)) return state;
      return {
        ...state,
        status: "validating",
        userId: event.userId,
        error: null,
      };
    case "USER_VALIDATED":
      if (!isCurrentOperation(state, event.operationId)) return state;
      return {
        ...state,
        route: "restoring",
        status: "loadingProfile",
        userId: event.userId,
        profile: null,
        error: null,
      };
    case "PROFILE_LOADED":
      if (
        !isCurrentOperation(state, event.operationId) ||
        state.userId !== event.profile.id
      ) {
        return state;
      }
      return {
        ...state,
        route: event.profile.onboardingCompletedAt
          ? "ready"
          : "needsOnboarding",
        status: "idle",
        profile: event.profile,
        error: null,
      };
    case "PROFILE_MISSING":
      if (!isCurrentOperation(state, event.operationId)) return state;
      return {
        ...state,
        route: "needsOnboarding",
        status: "idle",
        profile: null,
        error: createAuthError("AUTH_PROFILE_UNAVAILABLE"),
      };
    case "SESSION_MISSING":
    case "SIGNED_OUT":
      if (!isCurrentOperation(state, event.operationId)) return state;
      return clearedState();
    case "ACCOUNT_CHANGED":
      if (
        state.userId === event.userId &&
        isCurrentOperation(state, event.operationId)
      ) {
        return state;
      }
      return {
        ...initialAuthState,
        status: "loadingProfile",
        userId: event.userId,
        operationId: event.operationId,
      };
    case "ONBOARDING_COMPLETED":
      if (state.userId !== event.profile.id) return state;
      return {
        ...state,
        route: "ready",
        status: "idle",
        profile: event.profile,
        error: null,
      };
    case "NETWORK_UNAVAILABLE":
      return {
        ...state,
        status: "offline",
        error: createAuthError("AUTH_NETWORK_UNAVAILABLE"),
      };
    case "SESSION_REVOKED":
      return clearedState(createAuthError("AUTH_SESSION_EXPIRED"));
  }
}
