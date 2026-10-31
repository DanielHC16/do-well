import { useLocalSearchParams } from "expo-router";
import { useAuth } from "@/features/auth/context/useAuth";

import { WorkerGigDetailScreen } from "@/features/discovery/screens/WorkerGigDetailScreen";

export default function WorkerGigDetailRoute() {
  const { gigId } = useLocalSearchParams<{ gigId: string }>();
  const { state } = useAuth();
  return (
    <WorkerGigDetailScreen
      gigId={gigId ?? ""}
      userId={state.userId ?? undefined}
    />
  );
}
