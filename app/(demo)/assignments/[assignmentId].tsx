import { useLocalSearchParams } from "expo-router";

import { DemoAssignmentScreen } from "@/features/demo/screens/DemoAssignmentScreen";

export default function DemoAssignmentRoute() {
  const { assignmentId } = useLocalSearchParams<{
    assignmentId: string | string[];
  }>();
  const resolvedAssignmentId =
    typeof assignmentId === "string" ? assignmentId : (assignmentId[0] ?? "");
  return <DemoAssignmentScreen assignmentId={resolvedAssignmentId} />;
}
