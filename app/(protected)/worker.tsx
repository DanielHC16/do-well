import { useLocalSearchParams } from "expo-router";

import { useAuth } from "@/features/auth/context/useAuth";
import { ProfileRecoveryBoundary } from "@/features/profile/components/ProfileRecoveryBoundary";
import {
  AuthenticatedHomeScreen,
  type HomeIntent,
} from "@/features/shell/components/AuthenticatedHomeScreen";

function readIntent(
  params: Readonly<{ intent?: string; at?: string }>,
): HomeIntent | null {
  if ((params.intent === "near" || params.intent === "remote") && params.at)
    return { kind: params.intent, at: params.at };
  return null;
}

export default function WorkerHomeScreen() {
  const { state } = useAuth();
  const params = useLocalSearchParams<{ intent?: string; at?: string }>();

  if (!state.profile) {
    return <ProfileRecoveryBoundary />;
  }

  return (
    <AuthenticatedHomeScreen
      mode="worker"
      profile={state.profile}
      intent={readIntent(params)}
    />
  );
}
