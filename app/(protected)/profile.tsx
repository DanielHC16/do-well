import { useAuth } from "@/features/auth/context/useAuth";
import { ProfileRecoveryBoundary } from "@/features/profile/components/ProfileRecoveryBoundary";
import { AuthenticatedProfileScreen } from "@/features/shell/components/AuthenticatedProfileScreen";

export default function ProfileRoute() {
  const { signOut, state } = useAuth();
  const busy = state.status === "signingOut";

  if (!state.profile) {
    return <ProfileRecoveryBoundary />;
  }

  return (
    <AuthenticatedProfileScreen
      busy={busy}
      onSignOut={signOut}
      profile={state.profile}
    />
  );
}
