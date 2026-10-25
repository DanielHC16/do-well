import { Redirect, Stack } from "expo-router";

import { readAppRuntime } from "@/shared/config/app-runtime";

export default function DemoLayout() {
  if (readAppRuntime() !== "demo") {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
