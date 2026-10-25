import { useLocalSearchParams } from "expo-router";

import { DemoGigDetailScreen } from "@/features/demo/screens/DemoGigDetailScreen";

export default function DemoGigDetailRoute() {
  const { gigId } = useLocalSearchParams<{ gigId: string | string[] }>();
  const resolvedGigId = typeof gigId === "string" ? gigId : (gigId[0] ?? "");
  return <DemoGigDetailScreen gigId={resolvedGigId} />;
}
