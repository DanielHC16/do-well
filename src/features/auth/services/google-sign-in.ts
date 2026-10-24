import { createAuthError, mapAuthError } from "../model/auth-errors";
import {
  consumeAuthCallback,
  validateGoogleAuthorizationUrl,
} from "../model/oauth-callback";
import type { PendingAuthAttemptStore } from "../../../shared/persistence/auth-storage";

const AUTH_CALLBACK = "dowell://auth/callback";

let activeBrowserCompletion: Promise<void> | null = null;

type BrowserResult = Readonly<{ type: string; url?: string }>;

type GoogleSignInDependencies = Readonly<{
  configuredSupabaseUrl: string;
  attemptStore: PendingAuthAttemptStore;
  beginGoogleSignIn: () => Promise<{
    authorizationUrl: string;
    flowId: string;
  }>;
  exchangeCode: (code: string, flowId?: string) => Promise<void>;
  openAuthSession: (
    authorizationUrl: string,
    redirectUrl: string,
  ) => Promise<BrowserResult>;
}>;

export function createGoogleSignInService(
  dependencies: GoogleSignInDependencies,
) {
  async function consumeAndExchange(callbackUrl: string): Promise<void> {
    const callback = await consumeAuthCallback(
      callbackUrl,
      dependencies.attemptStore,
    );
    if (callback.kind !== "google") {
      throw createAuthError("AUTH_INVALID_CALLBACK");
    }
    await dependencies.exchangeCode(callback.code, callback.flowId);
  }

  async function complete(callbackUrl: string): Promise<void> {
    if (activeBrowserCompletion) {
      await activeBrowserCompletion;
      return;
    }
    await consumeAndExchange(callbackUrl);
  }

  async function runBrowserSession(): Promise<void> {
    const authorization = await dependencies.beginGoogleSignIn();
    const trustedAuthorizationUrl = validateGoogleAuthorizationUrl(
      authorization.authorizationUrl,
      dependencies.configuredSupabaseUrl,
    );
    const started = await dependencies.attemptStore.start({
      kind: "google",
      flowId: authorization.flowId,
    });
    if (!started) throw createAuthError("AUTH_UNAVAILABLE");

    let browserResult: BrowserResult;
    try {
      browserResult = await dependencies.openAuthSession(
        trustedAuthorizationUrl,
        AUTH_CALLBACK,
      );
    } catch (error) {
      await dependencies.attemptStore.clear();
      throw mapAuthError(error);
    }

    if (browserResult.type === "cancel" || browserResult.type === "dismiss") {
      await dependencies.attemptStore.clear();
      throw createAuthError("AUTH_CANCELLED");
    }
    if (browserResult.type !== "success" || !browserResult.url) {
      await dependencies.attemptStore.clear();
      throw createAuthError("AUTH_UNAVAILABLE");
    }

    await consumeAndExchange(browserResult.url);
  }

  return {
    complete,
    start(): Promise<void> {
      if (activeBrowserCompletion) return activeBrowserCompletion;
      const completion = runBrowserSession();
      activeBrowserCompletion = completion;
      void completion
        .finally(() => {
          if (activeBrowserCompletion === completion) {
            activeBrowserCompletion = null;
          }
        })
        .catch(() => undefined);
      return completion;
    },
  };
}
