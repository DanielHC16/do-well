import { Redirect, Stack } from "expo-router";

import { AuthBoundaryScreen } from "@/features/auth/context/AuthBoundaryScreen";
import { useAuth } from "@/features/auth/context/useAuth";
import { readAppRuntime } from "@/shared/config/app-runtime";

function ProductionOnboardingLayout() {
  const { refresh, state } = useAuth();

  if (state.route === "restoring") {
    return (
      <AuthBoundaryScreen
        message={state.error?.message ?? "Loading your profile…"}
        onRetry={state.error?.retryable ? () => void refresh() : undefined}
      />
    );
  }
  if (state.route === "signedOut") {
    return <Redirect href="../(public)/sign-in" />;
  }
  if (state.route === "ready") return <Redirect href="../(protected)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function OnboardingLayout() {
  if (readAppRuntime() === "demo") {
    return <Redirect href="/(demo)" />;
  }

  return <ProductionOnboardingLayout />;
}
