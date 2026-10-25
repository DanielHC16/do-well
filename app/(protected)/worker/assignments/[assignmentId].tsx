import { useLocalSearchParams } from "expo-router";

import { WorkerAssignmentDetailScreen } from "@/features/assignments/screens/WorkerAssignmentDetailScreen";

export default function WorkerAssignmentDetailRoute() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  return <WorkerAssignmentDetailScreen assignmentId={assignmentId ?? ""} />;
}
