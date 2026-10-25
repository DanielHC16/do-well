import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setupTheme } from "@/features/setup/setupTheme";

export function ProtectedRouteUnavailableScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <Text style={styles.kicker}>WRONG TURN</Text>
        <Text accessibilityRole="header" style={styles.title}>
          This notice is not posted.
        </Text>
        <Text style={styles.body}>
          The workspace route may have moved, or the feature has not arrived
          yet.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(protected)")}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Return to workspace</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    alignItems: "center",
    backgroundColor: setupTheme.color.background,
    flex: 1,
    justifyContent: "center",
    padding: setupTheme.spacing.section,
  },
  card: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.section,
    maxWidth: 520,
    padding: setupTheme.spacing.content,
    width: "100%",
  },
  kicker: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  title: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.title,
    fontWeight: "900",
  },
  body: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: 24,
  },
  button: {
    alignItems: "center",
    backgroundColor: setupTheme.color.highlight,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 52,
  },
  buttonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
});
