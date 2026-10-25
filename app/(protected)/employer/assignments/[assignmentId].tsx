import { useLocalSearchParams } from "expo-router";

import { EmployerAssignmentDetailScreen } from "@/features/assignments/screens/EmployerAssignmentDetailScreen";

export default function EmployerAssignmentDetailRoute() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  return <EmployerAssignmentDetailScreen assignmentId={assignmentId ?? ""} />;
}
