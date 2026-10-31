import { useLocalSearchParams } from "expo-router";

import { EmployerAssignmentDetailScreen } from "@/features/assignments/screens/EmployerAssignmentDetailScreen";
import { useAuth } from "@/features/auth/context/useAuth";

export default function EmployerAssignmentDetailRoute() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const { state } = useAuth();
  return (
    <EmployerAssignmentDetailScreen
      key={`${state.userId ?? "unavailable"}:${assignmentId}`}
      assignmentId={assignmentId ?? ""}
      userId={state.userId ?? undefined}
    />
  );
}
