import { useAuth } from "@/features/auth/context/useAuth";
import { ProfileRecoveryBoundary } from "@/features/profile/components/ProfileRecoveryBoundary";
import { AccountCapabilityBoundary } from "@/features/settings/components/AccountCapabilityBoundary";
import { accountGateway } from "@/features/settings/data/account-gateway";
import { AccountSettingsScreen } from "@/features/settings/screens/AccountSettingsScreen";

export default function SettingsRoute() {
  const { signOut, state } = useAuth();
  const profile = state.profile;
  if (!profile || state.userId !== profile.id)
    return <ProfileRecoveryBoundary />;
  return (
    <AccountCapabilityBoundary key={profile.id} userId={profile.id}>
      {(capabilities) => (
        <AccountSettingsScreen
          capabilities={capabilities}
          profile={profile}
          onPersistPreferredMode={(mode) =>
            accountGateway.setPreferredMode(profile.id, mode)
          }
          onSignOut={signOut}
        />
      )}
    </AccountCapabilityBoundary>
  );
}
