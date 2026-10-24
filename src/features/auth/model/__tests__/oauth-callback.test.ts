import {
  consumeAuthCallback,
  validateGoogleAuthorizationUrl,
} from "../oauth-callback";
import { createPendingAuthAttemptStore } from "../../../../shared/persistence/auth-storage";

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: async (key: string) => {
      values.delete(key);
    },
  };
}

describe("auth callbacks", () => {
  it.each([
    "http://auth/callback?code=one",
    "dowell://evil/callback?code=one",
    "dowell://auth/other?code=one",
    "dowell://user@auth/callback?code=one",
    "dowell://auth:444/callback?code=one",
    "dowell://auth/callback/?code=one",
    "dowell://auth/callback?code=one#fragment",
    "dowell://auth/callback",
    "dowell://auth/callback?code=",
    "dowell://auth/callback?code=one&code=two",
    "dowell://auth/callback?code=one&error=access_denied",
    "not a url",
  ])("rejects hostile callback %s", async (callbackUrl) => {
    const store = createPendingAuthAttemptStore(createMemoryStorage());
    await store.start({ kind: "google", flowId: "flow-a" });

    await expect(consumeAuthCallback(callbackUrl, store)).rejects.toMatchObject(
      { code: "AUTH_INVALID_CALLBACK" },
    );
    await expect(
      consumeAuthCallback("dowell://auth/callback?code=one", store),
    ).rejects.toMatchObject({ code: "AUTH_INVALID_CALLBACK" });
  });

  it.each([
    ["google", "dowell://auth/callback?code=oauth-code", "flow-a"],
    ["emailConfirmation", "dowell://auth/callback?code=email-code", undefined],
    [
      "passwordRecovery",
      "dowell://auth/reset-password?code=recovery-code",
      undefined,
    ],
  ] as const)(
    "accepts one live %s callback",
    async (kind, callbackUrl, flowId) => {
      const store = createPendingAuthAttemptStore(createMemoryStorage());
      if (kind === "google") {
        await store.start({ kind, flowId: "flow-a" });
      } else {
        await store.start({ kind });
      }

      await expect(consumeAuthCallback(callbackUrl, store)).resolves.toEqual({
        kind,
        code: expect.any(String),
        flowId,
      });
      await expect(
        consumeAuthCallback(callbackUrl, store),
      ).rejects.toMatchObject({
        code: "AUTH_INVALID_CALLBACK",
      });
    },
  );

  it("consumes provider denial without exposing its description", async () => {
    const store = createPendingAuthAttemptStore(createMemoryStorage());
    await store.start({ kind: "google", flowId: "flow-a" });

    const rejection = consumeAuthCallback(
      "dowell://auth/callback?error=access_denied&error_description=private-detail",
      store,
    );
    await expect(rejection).rejects.toMatchObject({
      code: "AUTH_PROVIDER_DENIED",
    });
    await expect(rejection).rejects.not.toMatchObject({
      message: expect.stringContaining("private-detail"),
    });
  });

  it("rejects a callback whose route does not match the pending attempt", async () => {
    const store = createPendingAuthAttemptStore(createMemoryStorage());
    await store.start({ kind: "passwordRecovery" });

    await expect(
      consumeAuthCallback("dowell://auth/callback?code=one", store),
    ).rejects.toMatchObject({ code: "AUTH_INVALID_CALLBACK" });
  });
});

describe("authorization URL validation", () => {
  const origin = "https://project-ref.supabase.co";
  const valid =
    `${origin}/auth/v1/authorize?provider=google&` +
    "redirect_to=dowell%3A%2F%2Fauth%2Fcallback";

  it("accepts the exact Supabase Google authorization endpoint", () => {
    expect(validateGoogleAuthorizationUrl(valid, origin)).toBe(valid);
  });

  it.each([
    valid.replace("https:", "http:"),
    valid.replace(
      "project-ref.supabase.co",
      "project-ref.supabase.co.evil.test",
    ),
    valid.replace("https://", "https://user@"),
    valid.replace(".co/", ".co:444/"),
    valid.replace("/authorize?", "/authorize/?"),
    valid.replace("/authorize?", "/%61uthorize?"),
    `${valid}#fragment`,
    valid.replace("provider=google", "provider=github"),
    valid.replace(
      "dowell%3A%2F%2Fauth%2Fcallback",
      "dowell%3A%2F%2Fevil%2Fcallback",
    ),
  ])("rejects an untrusted authorization URL %s", (authorizationUrl) => {
    expect(() =>
      validateGoogleAuthorizationUrl(authorizationUrl, origin),
    ).toThrow(expect.objectContaining({ code: "AUTH_INVALID_CALLBACK" }));
  });
});
