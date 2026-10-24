import type { AuthEvent } from "../model/auth-reducer";
import {
  isAuthErrorCode,
  type AuthError,
  type AuthErrorCode,
} from "../model/auth-errors";
import type { AuthProfile } from "../model/auth-state";

type ProfileReader = Readonly<{
  getOwnProfile: (userId: string) => Promise<AuthProfile | null>;
  ensureProfile: () => Promise<AuthProfile | null>;
}>;

type AuthReader = Readonly<{
  getSession: () => Promise<Readonly<{ expiresAt: number | null }> | null>;
  getUser: () => Promise<Readonly<{ id: string; email: string | null }> | null>;
}>;

type RestoreDependencies = Readonly<{
  auth: AuthReader;
  profiles: ProfileReader;
  operationId: number;
  dispatch: (event: AuthEvent) => void;
  isCurrentOperation: () => boolean;
  saveProfileGate: (profile: AuthProfile) => Promise<void>;
  removeProfileGate: (userId: string) => Promise<void>;
  knownUserId?: string | null;
}>;

function isStableError(error: unknown): error is AuthError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.startsWith("AUTH_")
  );
}

function profileFailureCode(error: unknown): AuthErrorCode {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    isAuthErrorCode(error.code)
  ) {
    return error.code;
  }
  return "AUTH_PROFILE_UNAVAILABLE";
}

async function loadProfile(
  profiles: ProfileReader,
  userId: string,
): Promise<AuthProfile | null> {
  const existing = await profiles.getOwnProfile(userId);
  if (existing) return existing;
  return profiles.ensureProfile();
}

export async function restoreSession({
  auth,
  profiles,
  operationId,
  dispatch,
  isCurrentOperation,
  saveProfileGate,
  removeProfileGate,
  knownUserId = null,
}: RestoreDependencies): Promise<void> {
  dispatch({ type: "RESTORE_STARTED", operationId });
  let currentUserId = knownUserId;
  let userValidated = false;

  try {
    if (!knownUserId) {
      const provisionalSession = await auth.getSession();
      if (!provisionalSession) {
        dispatch({ type: "SESSION_MISSING", operationId });
        return;
      }
    }

    if (knownUserId) {
      dispatch({ type: "SESSION_FOUND", operationId, userId: knownUserId });
    }
    const user = await auth.getUser();
    if (!user) {
      dispatch({ type: "SESSION_MISSING", operationId });
      return;
    }

    currentUserId = user.id;
    dispatch({ type: "SESSION_FOUND", operationId, userId: user.id });
    dispatch({ type: "USER_VALIDATED", operationId, userId: user.id });
    userValidated = true;
    const profile = await loadProfile(profiles, user.id);
    if (!profile) {
      dispatch({
        type: "PROFILE_LOAD_FAILED",
        operationId,
        userId: user.id,
        errorCode: "AUTH_PROFILE_UNAVAILABLE",
      });
      return;
    }
    if (!isCurrentOperation()) return;
    let snapshotSaved = false;
    try {
      await saveProfileGate(profile);
      snapshotSaved = true;
    } catch {
      // The server profile remains authoritative; cache failure cannot change access.
    }
    if (!isCurrentOperation()) {
      if (snapshotSaved) {
        try {
          await removeProfileGate(profile.id);
        } catch {
          // A stale cache entry is non-authoritative and cleanup is best-effort.
        }
      }
      return;
    }
    dispatch({ type: "PROFILE_LOADED", operationId, profile });
  } catch (error) {
    if (isStableError(error) && error.code === "AUTH_NETWORK_UNAVAILABLE") {
      dispatch({
        type: "NETWORK_UNAVAILABLE",
        operationId,
        userId: currentUserId,
      });
      return;
    }
    if (
      currentUserId &&
      isStableError(error) &&
      error.code === "AUTH_SESSION_EXPIRED"
    ) {
      dispatch({
        type: "SESSION_REVOKED",
        operationId,
        userId: currentUserId,
      });
      return;
    }
    if (currentUserId && userValidated) {
      dispatch({
        type: "PROFILE_LOAD_FAILED",
        operationId,
        userId: currentUserId,
        errorCode: profileFailureCode(error),
      });
      return;
    }
    dispatch({ type: "VALIDATION_FAILED", operationId, userId: currentUserId });
  }
}
