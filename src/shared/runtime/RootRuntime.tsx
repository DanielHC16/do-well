import type { PropsWithChildren } from "react";

import { AuthProvider } from "@/features/auth/context/AuthProvider";
import { DemoProvider } from "@/features/demo/context/DemoProvider";
import { readAppRuntime, type AppRuntime } from "@/shared/config/app-runtime";

type RootRuntimeProps = PropsWithChildren<{
  runtime?: AppRuntime;
}>;

export function RootRuntime({
  children,
  runtime = readAppRuntime(),
}: RootRuntimeProps) {
  if (runtime === "demo") {
    return <DemoProvider>{children}</DemoProvider>;
  }

  return <AuthProvider>{children}</AuthProvider>;
}
