import { useLocalSearchParams } from "expo-router";

import { useAuth } from "@/features/auth/context/useAuth";
import { ProfileRecoveryBoundary } from "@/features/profile/components/ProfileRecoveryBoundary";
import { useShellMode } from "@/features/shell/context/useShellMode";
import type { WorkSection } from "@/features/work/data/work-gateway";
import { MyWorkScreen } from "@/features/work/screens/MyWorkScreen";

const SECTIONS: readonly WorkSection[] = [
  "applications",
  "listings",
  "active",
  "completed",
];

export default function WorkRoute() {
  const { state } = useAuth();
  const { mode } = useShellMode();
  const { section } = useLocalSearchParams<{ section?: string }>();
  // A Home stat tile can deep-link a section; ignore anything unexpected.
  const initialSection = SECTIONS.find((value) => value === section);
  if (!state.profile) return <ProfileRecoveryBoundary />;
  return (
    <MyWorkScreen
      key={`${state.profile.id}:${mode}:${initialSection ?? ""}`}
      userId={state.profile.id}
      mode={mode}
      initialSection={initialSection}
    />
  );
}
