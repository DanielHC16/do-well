import { Stack } from "expo-router";

import { AuthProvider } from "@/features/auth/context/AuthProvider";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
