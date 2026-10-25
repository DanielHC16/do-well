import * as WebBrowser from "expo-web-browser";
import { useMemo } from "react";

import { AccountAccessScreen } from "@/features/auth/components/AccountAccessScreen";
import { pendingAuthAttemptStore } from "@/features/auth/data/pending-auth-attempts";
import { useAuth } from "@/features/auth/context/useAuth";
import { createGoogleSignInService } from "@/features/auth/services/google-sign-in";
import { readPublicEnv } from "@/shared/config/public-env";

export default function SignInRoute() {
  const auth = useAuth();
  const service = useMemo(() => {
    const config = readPublicEnv();
    return createGoogleSignInService({
      configuredSupabaseUrl: config.supabaseUrl,
      attemptStore: pendingAuthAttemptStore,
      beginGoogleSignIn: auth.beginGoogleSignIn,
      exchangeCode: auth.exchangeCode,
      openAuthSession: WebBrowser.openAuthSessionAsync,
    });
  }, [auth.beginGoogleSignIn, auth.exchangeCode]);

  return (
    <AccountAccessScreen
      onGoogleSignIn={service.start}
      onPasswordSignIn={auth.signInWithPassword}
      onSignUp={auth.signUp}
    />
  );
}
