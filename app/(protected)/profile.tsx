import { useAuth } from "@/features/auth/context/useAuth";
import { AuthenticatedProfileScreen } from "@/features/shell/components/AuthenticatedProfileScreen";

const fallbackProfile = {
  id: "user",
  displayName: "Neighbor",
  homeArea: null,
  onboardingCompletedAt: null,
};

export default function ProfileRoute() {
  const { signOut, state } = useAuth();
  const busy = state.status === "signingOut";

  return (
    <AuthenticatedProfileScreen
      busy={busy}
      onSignOut={signOut}
      profile={state.profile ?? fallbackProfile}
    />
  );
}
