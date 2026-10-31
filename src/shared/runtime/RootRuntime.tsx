import type { PropsWithChildren } from "react";

import { AuthProvider } from "@/features/auth/context/AuthProvider";
import { ConnectivityProvider } from "@/features/connectivity/context/ConnectivityProvider";
import { DemoProvider } from "@/features/demo/context/DemoProvider";
import { NotificationResponseObserver } from "@/features/notifications/components/NotificationResponseObserver";
import { readAppRuntime, type AppRuntime } from "@/shared/config/app-runtime";
import { DevelopmentToolsPresentation } from "./DevelopmentToolsPresentation";

type RootRuntimeProps = PropsWithChildren<{
  runtime?: AppRuntime;
}>;

export function RootRuntime({
  children,
  runtime = readAppRuntime(),
}: RootRuntimeProps) {
  if (runtime === "demo") {
    return (
      <ConnectivityProvider>
        <DevelopmentToolsPresentation />
        <DemoProvider>{children}</DemoProvider>
      </ConnectivityProvider>
    );
  }

  return (
    <ConnectivityProvider>
      <DevelopmentToolsPresentation />
      <AuthProvider>
        <NotificationResponseObserver />
        {children}
      </AuthProvider>
    </ConnectivityProvider>
  );
}
