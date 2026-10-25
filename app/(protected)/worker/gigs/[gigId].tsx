import { useLocalSearchParams } from "expo-router";

import { WorkerGigDetailScreen } from "@/features/discovery/screens/WorkerGigDetailScreen";

export default function WorkerGigDetailRoute() {
  const { gigId } = useLocalSearchParams<{ gigId: string }>();
  return <WorkerGigDetailScreen gigId={gigId ?? ""} />;
}
