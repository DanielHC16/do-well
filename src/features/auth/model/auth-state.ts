import type { AuthError } from "./auth-errors";

export type AuthRoute = "restoring" | "signedOut" | "needsOnboarding" | "ready";

export type AuthStatus =
  | "idle"
  | "restoring"
  | "validating"
  | "loadingProfile"
  | "signingIn"
  | "signingOut"
  | "offline";

export type AuthProfile = Readonly<{
  id: string;
  displayName: string;
  homeArea: string | null;
  onboardingCompletedAt: string | null;
}>;

export type AuthState = Readonly<{
  route: AuthRoute;
  status: AuthStatus;
  userId: string | null;
  profile: AuthProfile | null;
  error: AuthError | null;
  operationId: number | null;
}>;

export const initialAuthState: AuthState = Object.freeze({
  route: "restoring",
  status: "idle",
  userId: null,
  profile: null,
  error: null,
  operationId: null,
});
