import { adminGateway } from "@/features/admin/data/admin-gateway";
import { AdminConsoleScreen } from "@/features/admin/screens/AdminConsoleScreen";
import { useAuth } from "@/features/auth/context/useAuth";
import { ProfileRecoveryBoundary } from "@/features/profile/components/ProfileRecoveryBoundary";
import { AccountCapabilityBoundary } from "@/features/settings/components/AccountCapabilityBoundary";

export default function AdminRoute() {
  const { state } = useAuth();
  const profile = state.profile;
  if (!profile || state.userId !== profile.id)
    return <ProfileRecoveryBoundary />;
  return (
    <AccountCapabilityBoundary key={profile.id} userId={profile.id}>
      {(capabilities) => (
        <AdminConsoleScreen
          gateway={adminGateway}
          isAdmin={capabilities.isAdmin}
        />
      )}
    </AccountCapabilityBoundary>
  );
}
