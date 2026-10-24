import {
  type PendingAuthAttempt,
  type PendingAuthAttemptStore,
} from "../../../shared/persistence/auth-storage";
import { createAuthError } from "./auth-errors";

const CALLBACK_PROTOCOL = "dowell:";
const CALLBACK_HOST = "auth";
const AUTH_CALLBACK_PATH = "/callback";
const RESET_CALLBACK_PATH = "/reset-password";
const AUTH_CALLBACK_URL = "dowell://auth/callback";

function invalidCallback(): never {
  throw createAuthError("AUTH_INVALID_CALLBACK");
}

function parseExactUrl(rawUrl: string): URL {
  try {
    return new URL(rawUrl);
  } catch {
    return invalidCallback();
  }
}

function expectedPath(attempt: PendingAuthAttempt): string {
  return attempt.kind === "passwordRecovery"
    ? RESET_CALLBACK_PATH
    : AUTH_CALLBACK_PATH;
}

function hasExactCallbackAuthority(url: URL): boolean {
  return (
    url.protocol === CALLBACK_PROTOCOL &&
    url.hostname === CALLBACK_HOST &&
    url.username === "" &&
    url.password === "" &&
    url.port === "" &&
    url.hash === "" &&
    (url.pathname === AUTH_CALLBACK_PATH ||
      url.pathname === RESET_CALLBACK_PATH)
  );
}

export type AuthCallbackResult = Readonly<{
  kind: PendingAuthAttempt["kind"];
  code: string;
  flowId?: string;
}>;

export async function consumeAuthCallback(
  rawUrl: string,
  attemptStore: PendingAuthAttemptStore,
): Promise<AuthCallbackResult> {
  let url: URL;
  try {
    url = parseExactUrl(rawUrl);
  } catch {
    await attemptStore.clear();
    return invalidCallback();
  }

  if (!hasExactCallbackAuthority(url)) {
    await attemptStore.clear();
    return invalidCallback();
  }

  const codes = url.searchParams.getAll("code");
  const errors = url.searchParams.getAll("error");
  const hasOneCode = codes.length === 1 && codes[0].trim() !== "";
  const hasOneError = errors.length === 1 && errors[0].trim() !== "";
  if (hasOneCode === hasOneError) {
    await attemptStore.clear();
    return invalidCallback();
  }

  const consumed = await attemptStore.consume();
  if (consumed.status === "expired") {
    throw createAuthError("AUTH_CODE_EXPIRED");
  }
  if (consumed.status !== "valid") return invalidCallback();
  if (url.pathname !== expectedPath(consumed.attempt)) return invalidCallback();

  if (hasOneError) {
    throw createAuthError(
      errors[0] === "access_denied"
        ? "AUTH_PROVIDER_DENIED"
        : "AUTH_UNAVAILABLE",
    );
  }

  return {
    kind: consumed.attempt.kind,
    code: codes[0],
    ...(consumed.attempt.kind === "google"
      ? { flowId: consumed.attempt.flowId }
      : {}),
  };
}

export function validateGoogleAuthorizationUrl(
  rawAuthorizationUrl: string,
  configuredSupabaseUrl: string,
): string {
  const authorizationUrl = parseExactUrl(rawAuthorizationUrl);
  const configuredUrl = parseExactUrl(configuredSupabaseUrl);
  const providers = authorizationUrl.searchParams.getAll("provider");
  const redirects = authorizationUrl.searchParams.getAll("redirect_to");

  if (
    authorizationUrl.origin !== configuredUrl.origin ||
    authorizationUrl.username !== "" ||
    authorizationUrl.password !== "" ||
    authorizationUrl.pathname !== "/auth/v1/authorize" ||
    authorizationUrl.hash !== "" ||
    providers.length !== 1 ||
    providers[0] !== "google" ||
    redirects.length !== 1 ||
    redirects[0] !== AUTH_CALLBACK_URL
  ) {
    return invalidCallback();
  }

  return rawAuthorizationUrl;
}
