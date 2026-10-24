import { createContext, useContext } from "react";

import type { getAuthGateway } from "../data/auth-gateway";
import type { AuthState } from "../model/auth-state";

export type ReturnTypeOfAuthGateway = ReturnType<typeof getAuthGateway>;

export type AuthContextValue = Readonly<{
  state: AuthState;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  beginGoogleSignIn: ReturnTypeOfAuthGateway["beginGoogleSignIn"];
  exchangeCode: (code: string, flowId?: string) => Promise<void>;
  resendConfirmation: ReturnTypeOfAuthGateway["resendConfirmation"];
  requestPasswordReset: ReturnTypeOfAuthGateway["requestPasswordReset"];
  updatePassword: ReturnTypeOfAuthGateway["updatePassword"];
  completeOnboarding: (displayName: string, homeArea: string) => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}>;

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider.");
  return value;
}
