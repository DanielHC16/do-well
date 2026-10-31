import { Stack } from "expo-router";

import { RootRuntime } from "@/shared/runtime/RootRuntime";
import { TypographyProvider } from "@/shared/ui/Typography";

export default function RootLayout() {
  return (
    <TypographyProvider>
      <RootRuntime>
        <Stack screenOptions={{ headerShown: false }} />
      </RootRuntime>
    </TypographyProvider>
  );
}
