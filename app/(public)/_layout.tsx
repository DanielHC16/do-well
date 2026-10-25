import { Redirect, Stack } from "expo-router";

import { AuthBoundaryScreen } from "@/features/auth/context/AuthBoundaryScreen";
import { useAuth } from "@/features/auth/context/useAuth";
import { readAppRuntime } from "@/shared/config/app-runtime";

function ProductionPublicLayout() {
  const { refresh, state } = useAuth();

  if (state.route === "restoring") {
    return (
      <AuthBoundaryScreen
        message={state.error?.message ?? "Restoring your session…"}
        onRetry={state.error?.retryable ? () => void refresh() : undefined}
      />
    );
  }
  if (state.route === "needsOnboarding") {
    return <Redirect href="../(onboarding)" />;
  }
  if (state.route === "ready") return <Redirect href="../(protected)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function PublicLayout() {
  if (readAppRuntime() === "demo") {
    return <Redirect href="/(demo)" />;
  }

  return <ProductionPublicLayout />;
}
