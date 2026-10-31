import { useLocalSearchParams } from "expo-router";

import { WorkerAssignmentDetailScreen } from "@/features/assignments/screens/WorkerAssignmentDetailScreen";
import { useAuth } from "@/features/auth/context/useAuth";

export default function WorkerAssignmentDetailRoute() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const { state } = useAuth();
  return (
    <WorkerAssignmentDetailScreen
      key={`${state.userId ?? "unavailable"}:${assignmentId}`}
      assignmentId={assignmentId ?? ""}
      userId={state.userId ?? undefined}
    />
  );
}
