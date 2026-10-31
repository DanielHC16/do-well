import { useAuth } from "@/features/auth/context/useAuth";
import { ProfileRecoveryBoundary } from "@/features/profile/components/ProfileRecoveryBoundary";
import { useShellMode } from "@/features/shell/context/useShellMode";
import { MyWorkScreen } from "@/features/work/screens/MyWorkScreen";

export default function WorkRoute() {
  const { state } = useAuth();
  const { mode } = useShellMode();
  if (!state.profile) return <ProfileRecoveryBoundary />;
  return (
    <MyWorkScreen
      key={`${state.profile.id}:${mode}`}
      userId={state.profile.id}
      mode={mode}
    />
  );
}
