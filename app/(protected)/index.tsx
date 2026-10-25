import { Redirect } from "expo-router";

import { useShellMode } from "@/features/shell/context/useShellMode";

export default function ProtectedIndexRoute() {
  const { mode } = useShellMode();
  return (
    <Redirect
      href={
        mode === "employer" ? "/(protected)/employer" : "/(protected)/worker"
      }
    />
  );
}
