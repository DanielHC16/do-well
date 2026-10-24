import { mapAuthError } from "../auth-errors";

describe("mapAuthError", () => {
  it.each([
    [{ name: "AbortError" }, "AUTH_CANCELLED"],
    [{ status: 0, message: "Failed to fetch" }, "AUTH_NETWORK_UNAVAILABLE"],
    [{ status: 400, code: "invalid_credentials" }, "AUTH_INVALID_CREDENTIALS"],
    [
      { status: 400, code: "email_not_confirmed" },
      "AUTH_CONFIRMATION_REQUIRED",
    ],
    [
      { status: 400, code: "oauth_provider_not_supported" },
      "AUTH_PROVIDER_DENIED",
    ],
    [{ status: 400, code: "bad_code_verifier" }, "AUTH_CODE_EXPIRED"],
    [{ status: 401, code: "refresh_token_not_found" }, "AUTH_SESSION_EXPIRED"],
    [{ status: 429 }, "AUTH_RATE_LIMITED"],
    [
      { status: 503, message: "database detail must remain private" },
      "AUTH_UNAVAILABLE",
    ],
  ] as const)("maps provider failures to %s", (providerError, expectedCode) => {
    expect(mapAuthError(providerError).code).toBe(expectedCode);
  });

  it("never exposes a raw provider message", () => {
    const rawMessage = "secret vendor diagnostics";

    expect(
      JSON.stringify(mapAuthError({ status: 500, message: rawMessage })),
    ).not.toContain(rawMessage);
  });
});
