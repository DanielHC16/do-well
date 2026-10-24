import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/context/useAuth";
import { setupTheme } from "@/features/setup/setupTheme";

export default function ProtectedIndexRoute() {
  const { signOut, state } = useAuth();
  const busy = state.status === "signingOut";

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          You’re ready
        </Text>
        <Text style={styles.message}>
          Your Do Well profile is ready. The main workspace arrives in the next
          milestone.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void signOut()}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {busy ? "Signing out…" : "Sign out"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: setupTheme.color.background,
    flex: 1,
  },
  content: {
    flex: 1,
    gap: setupTheme.spacing.content,
    justifyContent: "center",
    padding: setupTheme.spacing.content,
  },
  title: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.title,
    fontWeight: "700",
  },
  message: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.status,
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: setupTheme.color.readySurface,
    borderRadius: setupTheme.radius.status,
    paddingHorizontal: setupTheme.spacing.content,
    paddingVertical: setupTheme.spacing.compact,
  },
  buttonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.status,
    fontWeight: "600",
  },
});
