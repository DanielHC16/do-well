import { createAuthError } from "../../model/auth-errors";
import { createPendingAuthAttemptStore } from "../../../../shared/persistence/auth-storage";
import { createGoogleSignInService } from "../google-sign-in";

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

const authorizationUrl =
  "https://project-ref.supabase.co/auth/v1/authorize?provider=google&" +
  "redirect_to=dowell%3A%2F%2Fauth%2Fcallback";

type TestBrowserResult =
  | Readonly<{ type: "success"; url: string }>
  | Readonly<{ type: "cancel" | "dismiss" | "opened" | "locked" }>;

function createDependencies() {
  return {
    configuredSupabaseUrl: "https://project-ref.supabase.co",
    attemptStore: createPendingAuthAttemptStore(createMemoryStorage()),
    beginGoogleSignIn: jest.fn(async () => ({
      authorizationUrl,
      flowId: "flow-a",
    })),
    exchangeCode: jest.fn(async () => undefined),
    openAuthSession: jest.fn(async (): Promise<TestBrowserResult> => ({
      type: "success",
      url: "dowell://auth/callback?code=one-time-code",
    })),
  };
}

describe("Google sign-in service", () => {
  it("opens the trusted URL and exchanges one consumed callback", async () => {
    const dependencies = createDependencies();

    await createGoogleSignInService(dependencies).start();

    expect(dependencies.openAuthSession).toHaveBeenCalledWith(
      authorizationUrl,
      "dowell://auth/callback",
    );
    expect(dependencies.exchangeCode).toHaveBeenCalledWith(
      "one-time-code",
      "flow-a",
    );
  });

  it("coalesces the routed callback while the browser session owns completion", async () => {
    const dependencies = createDependencies();
    let resolveBrowser!: (result: TestBrowserResult) => void;
    dependencies.openAuthSession.mockImplementationOnce(
      () =>
        new Promise<TestBrowserResult>((resolve) => {
          resolveBrowser = resolve;
        }),
    );
    const browserService = createGoogleSignInService(dependencies);
    const callbackService = createGoogleSignInService(dependencies);

    const browserCompletion = browserService.start();
    for (let index = 0; index < 10; index += 1) {
      if (dependencies.openAuthSession.mock.calls.length > 0) break;
      await Promise.resolve();
    }
    expect(dependencies.openAuthSession).toHaveBeenCalledTimes(1);
    const routedCompletion = callbackService.complete(
      "dowell://auth/callback?code=one-time-code",
    );
    resolveBrowser({
      type: "success",
      url: "dowell://auth/callback?code=one-time-code",
    });

    await expect(
      Promise.all([browserCompletion, routedCompletion]),
    ).resolves.toEqual([undefined, undefined]);
    expect(dependencies.exchangeCode).toHaveBeenCalledTimes(1);
  });

  it.each(["cancel", "dismiss"] as const)(
    "clears the pending attempt when the browser returns %s",
    async (type) => {
      const dependencies = createDependencies();
      dependencies.openAuthSession.mockResolvedValueOnce({ type });
      const service = createGoogleSignInService(dependencies);

      await expect(service.start()).rejects.toMatchObject({
        code: "AUTH_CANCELLED",
      });
      await expect(
        service.complete("dowell://auth/callback?code=late-code"),
      ).rejects.toMatchObject({ code: "AUTH_INVALID_CALLBACK" });
    },
  );

  it("rejects an untrusted authorization URL before opening the browser", async () => {
    const dependencies = createDependencies();
    dependencies.beginGoogleSignIn.mockResolvedValueOnce({
      authorizationUrl:
        "https://project-ref.supabase.co.evil.test/auth/v1/authorize?provider=google&redirect_to=dowell%3A%2F%2Fauth%2Fcallback",
      flowId: "flow-a",
    });

    await expect(
      createGoogleSignInService(dependencies).start(),
    ).rejects.toMatchObject({ code: "AUTH_INVALID_CALLBACK" });
    expect(dependencies.openAuthSession).not.toHaveBeenCalled();
  });

  it("preserves safe provider denial without exposing callback details", async () => {
    const dependencies = createDependencies();
    dependencies.openAuthSession.mockResolvedValueOnce({
      type: "success",
      url: "dowell://auth/callback?error=access_denied&error_description=private",
    });

    await expect(
      createGoogleSignInService(dependencies).start(),
    ).rejects.toEqual(createAuthError("AUTH_PROVIDER_DENIED"));
  });
});
