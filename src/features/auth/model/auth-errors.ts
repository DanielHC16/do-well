export type AuthErrorCode =
  | "AUTH_CANCELLED"
  | "AUTH_NETWORK_UNAVAILABLE"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_CONFIRMATION_REQUIRED"
  | "AUTH_PROVIDER_DENIED"
  | "AUTH_INVALID_CALLBACK"
  | "AUTH_CODE_EXPIRED"
  | "AUTH_SESSION_EXPIRED"
  | "AUTH_PROFILE_UNAVAILABLE"
  | "AUTH_RATE_LIMITED"
  | "AUTH_UNAVAILABLE";

export type AuthError = Readonly<{
  code: AuthErrorCode;
  message: string;
  retryable: boolean;
}>;

type ProviderErrorShape = Readonly<{
  name?: unknown;
  status?: unknown;
  code?: unknown;
  message?: unknown;
}>;

const definitions: Record<AuthErrorCode, Omit<AuthError, "code">> = {
  AUTH_CANCELLED: { message: "Sign-in was cancelled.", retryable: true },
  AUTH_NETWORK_UNAVAILABLE: {
    message: "Authentication is unavailable while offline.",
    retryable: true,
  },
  AUTH_INVALID_CREDENTIALS: {
    message: "The email or password is incorrect.",
    retryable: true,
  },
  AUTH_CONFIRMATION_REQUIRED: {
    message: "Confirm your email before signing in.",
    retryable: true,
  },
  AUTH_PROVIDER_DENIED: {
    message: "The identity provider did not approve sign-in.",
    retryable: true,
  },
  AUTH_INVALID_CALLBACK: {
    message: "The sign-in callback is invalid.",
    retryable: true,
  },
  AUTH_CODE_EXPIRED: {
    message: "The sign-in link has expired. Start again.",
    retryable: true,
  },
  AUTH_SESSION_EXPIRED: {
    message: "Your session has expired. Sign in again.",
    retryable: true,
  },
  AUTH_PROFILE_UNAVAILABLE: {
    message: "Your profile is unavailable. Try again.",
    retryable: true,
  },
  AUTH_RATE_LIMITED: {
    message: "Too many attempts. Wait before trying again.",
    retryable: true,
  },
  AUTH_UNAVAILABLE: {
    message: "Authentication is temporarily unavailable.",
    retryable: true,
  },
};

export function createAuthError(code: AuthErrorCode): AuthError {
  return Object.freeze({ code, ...definitions[code] });
}

function readProviderError(error: unknown): ProviderErrorShape {
  return typeof error === "object" && error !== null
    ? (error as ProviderErrorShape)
    : {};
}

export function mapAuthError(error: unknown): AuthError {
  const providerError = readProviderError(error);
  const name = typeof providerError.name === "string" ? providerError.name : "";
  const code = typeof providerError.code === "string" ? providerError.code : "";
  const status =
    typeof providerError.status === "number" ? providerError.status : null;

  if (name === "AbortError") return createAuthError("AUTH_CANCELLED");
  if (status === 0) return createAuthError("AUTH_NETWORK_UNAVAILABLE");
  if (code === "invalid_credentials")
    return createAuthError("AUTH_INVALID_CREDENTIALS");
  if (code === "email_not_confirmed")
    return createAuthError("AUTH_CONFIRMATION_REQUIRED");
  if (code === "oauth_provider_not_supported")
    return createAuthError("AUTH_PROVIDER_DENIED");
  if (code === "bad_code_verifier") return createAuthError("AUTH_CODE_EXPIRED");
  if (code === "refresh_token_not_found" || status === 401)
    return createAuthError("AUTH_SESSION_EXPIRED");
  if (status === 429) return createAuthError("AUTH_RATE_LIMITED");

  return createAuthError("AUTH_UNAVAILABLE");
}
