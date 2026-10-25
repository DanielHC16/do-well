import { useAuth } from "@/features/auth/context/useAuth";
import { ProfileRecoveryBoundary } from "@/features/profile/components/ProfileRecoveryBoundary";
import { AuthenticatedHomeScreen } from "@/features/shell/components/AuthenticatedHomeScreen";

export default function WorkerHomeScreen() {
  const { state } = useAuth();

  if (!state.profile) {
    return <ProfileRecoveryBoundary />;
  }

  return <AuthenticatedHomeScreen mode="worker" profile={state.profile} />;
}
