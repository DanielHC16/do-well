import { useLocalSearchParams } from "expo-router";

import { ManageDemoGigScreen } from "@/features/demo/screens/ManageDemoGigScreen";

export default function ManageDemoGigRoute() {
  const { gigId } = useLocalSearchParams<{ gigId: string | string[] }>();
  const resolvedGigId = typeof gigId === "string" ? gigId : (gigId[0] ?? "");
  return <ManageDemoGigScreen gigId={resolvedGigId} />;
}
