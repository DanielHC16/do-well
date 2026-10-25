import { useLocalSearchParams } from "expo-router";

import { EmployerGigDetailScreen } from "@/features/gigs/screens/EmployerGigDetailScreen";

export default function EmployerGigDetailRoute() {
  const { gigId } = useLocalSearchParams<{ gigId: string }>();
  return <EmployerGigDetailScreen gigId={gigId ?? ""} />;
}
