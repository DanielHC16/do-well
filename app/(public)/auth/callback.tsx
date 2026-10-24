import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { GoogleCallbackScreen } from "@/features/auth/components/GoogleCallbackScreen";
import { useAuth } from "@/features/auth/context/useAuth";
import { pendingAuthAttemptStore } from "@/features/auth/data/pending-auth-attempts";
import {
  toSafeAuthError,
  type AuthError,
} from "@/features/auth/model/auth-errors";
import { createGoogleSignInService } from "@/features/auth/services/google-sign-in";
import { readPublicEnv } from "@/shared/config/public-env";

export default function AuthCallbackRoute() {
  const callbackUrl = Linking.useURL();
  const router = useRouter();
  const auth = useAuth();
  const processedUrl = useRef<string | null>(null);
  const [error, setError] = useState<AuthError | null>(null);
  const service = useMemo(() => {
    const config = readPublicEnv();
    return createGoogleSignInService({
      configuredSupabaseUrl: config.supabaseUrl,
      attemptStore: pendingAuthAttemptStore,
      beginGoogleSignIn: auth.beginGoogleSignIn,
      exchangeCode: auth.exchangeCode,
      openAuthSession: browserLaunchUnavailable,
    });
  }, [auth.beginGoogleSignIn, auth.exchangeCode]);

  useEffect(() => {
    if (!callbackUrl || processedUrl.current === callbackUrl) return;
    processedUrl.current = callbackUrl;
    let active = true;
    void service.complete(callbackUrl).catch((failure: unknown) => {
      if (active) setError(toSafeAuthError(failure));
    });
    return () => {
      active = false;
    };
  }, [callbackUrl, service]);

  return (
    <GoogleCallbackScreen
      error={error}
      onReturnToSignIn={() => router.replace("/(public)/sign-in")}
    />
  );
}

async function browserLaunchUnavailable(): Promise<never> {
  throw new Error("Browser launch is unavailable on the callback route.");
}
