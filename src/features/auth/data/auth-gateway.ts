import { z } from "zod";

import { getSupabaseClient } from "../../../shared/api/supabase";
import { createAuthError, mapAuthError } from "../model/auth-errors";
import {
  displayNameSchema,
  emailSchema,
  passwordSchema,
} from "../model/auth-schemas";

const AUTH_CALLBACK = "dowell://auth/callback";
const RESET_CALLBACK = "dowell://auth/reset-password";

type ProviderResult = Promise<Readonly<{ data: unknown; error: unknown }>>;
type ErrorOnlyResult = Promise<Readonly<{ error: unknown }>>;

export type AuthPort = Readonly<{
  signUp: (input: {
    email: string;
    password: string;
    options: { data: { display_name: string }; emailRedirectTo: string };
  }) => ProviderResult;
  signInWithPassword: (input: {
    email: string;
    password: string;
  }) => ProviderResult;
  resend: (input: {
    type: "signup";
    email: string;
    options: { emailRedirectTo: string };
  }) => ProviderResult;
  resetPasswordForEmail: (
    email: string,
    options: { redirectTo: string },
  ) => ProviderResult;
  updateUser: (input: { password: string }) => ProviderResult;
  signInWithOAuth: (input: {
    provider: "google";
    options: { redirectTo: string; skipBrowserRedirect: true };
  }) => ProviderResult;
  exchangeCodeForSession: (
    code: string,
    options: { flowId: string },
  ) => ProviderResult;
  getSession: () => ProviderResult;
  getUser: () => ProviderResult;
  signOut: (options: { scope: "local" }) => ErrorOnlyResult;
  startAutoRefresh: () => Promise<void>;
  stopAutoRefresh: () => Promise<void>;
}>;

const identitySchema = z.object({
  id: z.string().min(1),
  email: z.string().email().nullable().optional(),
});

const sessionSchema = z.object({
  access_token: z.string().min(1),
  expires_at: z.number().nullable().optional(),
});

const authDataSchema = z.object({
  user: identitySchema.nullable(),
  session: sessionSchema.nullable(),
});

const sessionDataSchema = z.object({ session: sessionSchema.nullable() });
const userDataSchema = z.object({ user: identitySchema.nullable() });
const oauthDataSchema = z.object({
  url: z.string().url(),
  flowId: z.string().min(1),
});

export type AppIdentity = Readonly<{ id: string; email: string | null }>;
export type AppSession = Readonly<{ expiresAt: number | null }>;
export type AuthResult = Readonly<{
  user: AppIdentity | null;
  session: AppSession | null;
}>;

function throwIfProviderFailed(error: unknown): void {
  if (error) throw mapAuthError(error);
}

function throwPasswordSignInFailure(error: unknown): void {
  if (!error) return;
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "email_not_confirmed"
  ) {
    throw createAuthError("AUTH_INVALID_CREDENTIALS");
  }
  throw mapAuthError(error);
}

function mapIdentity(value: z.infer<typeof identitySchema>): AppIdentity {
  return { id: value.id, email: value.email ?? null };
}

function mapSession(value: z.infer<typeof sessionSchema>): AppSession {
  return {
    expiresAt: value.expires_at ?? null,
  };
}

function parseAuthResult(data: unknown): AuthResult {
  const parsed = authDataSchema.parse(data);
  return {
    user: parsed.user ? mapIdentity(parsed.user) : null,
    session: parsed.session ? mapSession(parsed.session) : null,
  };
}

export function createAuthGateway(auth: AuthPort) {
  return {
    async signUp(email: string, password: string, displayName: string) {
      const result = await auth.signUp({
        email: emailSchema.parse(email),
        password: passwordSchema.parse(password),
        options: {
          data: { display_name: displayNameSchema.parse(displayName) },
          emailRedirectTo: AUTH_CALLBACK,
        },
      });
      throwIfProviderFailed(result.error);
      return parseAuthResult(result.data);
    },
    async signInWithPassword(email: string, password: string) {
      const result = await auth.signInWithPassword({
        email: emailSchema.parse(email),
        password: passwordSchema.parse(password),
      });
      throwPasswordSignInFailure(result.error);
      return parseAuthResult(result.data);
    },
    async resendConfirmation(email: string) {
      const result = await auth.resend({
        type: "signup",
        email: emailSchema.parse(email),
        options: { emailRedirectTo: AUTH_CALLBACK },
      });
      throwIfProviderFailed(result.error);
    },
    async requestPasswordReset(email: string) {
      const result = await auth.resetPasswordForEmail(
        emailSchema.parse(email),
        {
          redirectTo: RESET_CALLBACK,
        },
      );
      throwIfProviderFailed(result.error);
    },
    async updatePassword(password: string) {
      const result = await auth.updateUser({
        password: passwordSchema.parse(password),
      });
      throwIfProviderFailed(result.error);
    },
    async beginGoogleSignIn() {
      const result = await auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: AUTH_CALLBACK, skipBrowserRedirect: true },
      });
      throwIfProviderFailed(result.error);
      const data = oauthDataSchema.parse(result.data);
      return { authorizationUrl: data.url, flowId: data.flowId };
    },
    async exchangeCode(code: string, flowId: string) {
      const result = await auth.exchangeCodeForSession(code, { flowId });
      throwIfProviderFailed(result.error);
      return parseAuthResult(result.data);
    },
    async getSession(): Promise<AppSession | null> {
      const result = await auth.getSession();
      throwIfProviderFailed(result.error);
      const session = sessionDataSchema.parse(result.data).session;
      return session ? mapSession(session) : null;
    },
    async getUser(): Promise<AppIdentity | null> {
      const result = await auth.getUser();
      throwIfProviderFailed(result.error);
      const user = userDataSchema.parse(result.data).user;
      return user ? mapIdentity(user) : null;
    },
    async signOutLocal() {
      const result = await auth.signOut({ scope: "local" });
      throwIfProviderFailed(result.error);
    },
    startAutoRefresh: () => auth.startAutoRefresh(),
    stopAutoRefresh: () => auth.stopAutoRefresh(),
  };
}

let gateway: ReturnType<typeof createAuthGateway> | undefined;

export function getAuthGateway(): ReturnType<typeof createAuthGateway> {
  gateway ??= createAuthGateway(getSupabaseClient().auth);
  return gateway;
}
