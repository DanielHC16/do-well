import { useAuth } from "@/features/auth/context/useAuth";
import { ProfileRecoveryBoundary } from "@/features/profile/components/ProfileRecoveryBoundary";
import { AuthenticatedProfileScreen } from "@/features/shell/components/AuthenticatedProfileScreen";

export default function ProfileRoute() {
  const { refresh, signOut, state } = useAuth();
  const busy = state.status === "signingOut";

  if (!state.profile) {
    return <ProfileRecoveryBoundary />;
  }

  return (
    <AuthenticatedProfileScreen
      key={state.profile.id}
      busy={busy}
      onSignOut={signOut}
      onUpdated={refresh}
      profile={state.profile}
    />
  );
}
