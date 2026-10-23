import { createAuthError, type AuthErrorCode } from "./auth-errors";
import {
  initialAuthState,
  type AuthProfile,
  type AuthState,
} from "./auth-state";

export { initialAuthState } from "./auth-state";

type AsyncEvent = Readonly<{ operationId: number }>;

export type AuthEvent =
  | ({ type: "RESTORE_STARTED" } & AsyncEvent)
  | ({ type: "VALIDATION_STARTED"; userId: string } & AsyncEvent)
  | ({ type: "SESSION_VALIDATED"; userId: string } & AsyncEvent)
  | ({ type: "VALIDATION_FAILED"; userId: string | null } & AsyncEvent)
  | ({ type: "SESSION_FOUND"; userId: string } & AsyncEvent)
  | ({ type: "SESSION_MISSING" } & AsyncEvent)
  | ({ type: "USER_VALIDATED"; userId: string } & AsyncEvent)
  | ({ type: "PROFILE_LOADED"; profile: AuthProfile } & AsyncEvent)
  | ({ type: "PROFILE_MISSING" } & AsyncEvent)
  | ({
      type: "PROFILE_LOAD_FAILED";
      userId: string;
      errorCode: AuthErrorCode;
    } & AsyncEvent)
  | ({ type: "SIGN_IN_STARTED" } & AsyncEvent)
  | ({ type: "SIGN_OUT_STARTED" } & AsyncEvent)
  | ({ type: "SIGNED_OUT" } & AsyncEvent)
  | ({ type: "ACCOUNT_CHANGED"; userId: string } & AsyncEvent)
  | ({ type: "ONBOARDING_COMPLETED"; profile: AuthProfile } & AsyncEvent)
  | ({ type: "NETWORK_UNAVAILABLE"; userId: string | null } & AsyncEvent)
  | ({ type: "SESSION_REVOKED"; userId: string } & AsyncEvent);

function isCurrentOperation(state: AuthState, operationId: number): boolean {
  return state.operationId === operationId;
}

function isNewerOperation(state: AuthState, operationId: number): boolean {
  return state.operationId === null || operationId > state.operationId;
}

function isCurrentIdentity(
  state: AuthState,
  operationId: number,
  userId: string | null,
): boolean {
  return isCurrentOperation(state, operationId) && state.userId === userId;
}

function clearedState(error: AuthState["error"] = null): AuthState {
  return { ...initialAuthState, route: "signedOut", error };
}

export function authReducer(state: AuthState, event: AuthEvent): AuthState {
  switch (event.type) {
    case "RESTORE_STARTED":
      if (!isNewerOperation(state, event.operationId)) return state;
      return {
        ...initialAuthState,
        status: "restoring",
        operationId: event.operationId,
      };
    case "SIGN_IN_STARTED":
      if (!isNewerOperation(state, event.operationId)) return state;
      return {
        ...clearedState(),
        status: "signingIn",
        operationId: event.operationId,
      };
    case "VALIDATION_STARTED":
      if (
        !isNewerOperation(state, event.operationId) ||
        state.userId !== event.userId
      ) {
        return state;
      }
      return {
        ...state,
        status: "validating",
        error: null,
        operationId: event.operationId,
      };
    case "SIGN_OUT_STARTED":
      if (!isNewerOperation(state, event.operationId)) return state;
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
    case "SESSION_VALIDATED":
      if (!isCurrentIdentity(state, event.operationId, event.userId))
        return state;
      return { ...state, status: "idle", error: null };
    case "VALIDATION_FAILED":
      if (
        !isCurrentOperation(state, event.operationId) ||
        state.userId !== event.userId
      ) {
        return state;
      }
      return {
        ...state,
        route: "restoring",
        status: "idle",
        error: createAuthError("AUTH_UNAVAILABLE"),
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
    case "PROFILE_LOAD_FAILED":
      if (!isCurrentIdentity(state, event.operationId, event.userId))
        return state;
      return {
        ...state,
        route: "restoring",
        status: "idle",
        profile: null,
        error: createAuthError(event.errorCode),
      };
    case "SESSION_MISSING":
    case "SIGNED_OUT":
      if (!isCurrentOperation(state, event.operationId)) return state;
      return clearedState();
    case "ACCOUNT_CHANGED":
      if (!isNewerOperation(state, event.operationId)) return state;
      return {
        ...initialAuthState,
        status: "loadingProfile",
        userId: event.userId,
        operationId: event.operationId,
      };
    case "ONBOARDING_COMPLETED":
      if (
        !isCurrentIdentity(state, event.operationId, event.profile.id) ||
        event.profile.onboardingCompletedAt === null
      ) {
        return state;
      }
      return {
        ...state,
        route: "ready",
        status: "idle",
        profile: event.profile,
        error: null,
      };
    case "NETWORK_UNAVAILABLE":
      if (!isCurrentIdentity(state, event.operationId, event.userId))
        return state;
      return {
        ...state,
        status: "offline",
        error: createAuthError("AUTH_NETWORK_UNAVAILABLE"),
      };
    case "SESSION_REVOKED":
      if (!isCurrentIdentity(state, event.operationId, event.userId))
        return state;
      return clearedState(createAuthError("AUTH_SESSION_EXPIRED"));
  }
}
