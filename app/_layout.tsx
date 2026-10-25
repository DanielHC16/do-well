import { Stack } from "expo-router";

import { RootRuntime } from "@/shared/runtime/RootRuntime";

export default function RootLayout() {
  return (
    <RootRuntime>
      <Stack screenOptions={{ headerShown: false }} />
    </RootRuntime>
  );
}
