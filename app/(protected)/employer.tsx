import { useAuth } from "@/features/auth/context/useAuth";
import { ProfileRecoveryBoundary } from "@/features/profile/components/ProfileRecoveryBoundary";
import { AuthenticatedHomeScreen } from "@/features/shell/components/AuthenticatedHomeScreen";

export default function EmployerHomeScreen() {
  const { state } = useAuth();

  if (!state.profile) {
    return <ProfileRecoveryBoundary />;
  }

  return <AuthenticatedHomeScreen mode="employer" profile={state.profile} />;
}
