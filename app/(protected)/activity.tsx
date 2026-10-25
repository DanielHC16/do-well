import { AuthenticatedActivityScreen } from "@/features/shell/components/AuthenticatedActivityScreen";
import { useAuth } from "@/features/auth/context/useAuth";

export default function ActivityRoute() {
  const { state } = useAuth();
  if (!state.userId) return null;
  return <AuthenticatedActivityScreen userId={state.userId} />;
}
