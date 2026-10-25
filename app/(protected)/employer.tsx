import { useAuth } from "@/features/auth/context/useAuth";
import { AuthenticatedHomeScreen } from "@/features/shell/components/AuthenticatedHomeScreen";

const fallbackProfile = {
  id: "user",
  displayName: "Neighbor",
  homeArea: null,
  onboardingCompletedAt: null,
};

export default function EmployerHomeScreen() {
  const { state } = useAuth();
  return (
    <AuthenticatedHomeScreen
      mode="employer"
      profile={state.profile ?? fallbackProfile}
    />
  );
}
