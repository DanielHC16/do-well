import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setupTheme } from "./setupTheme";

export function SetupSmokeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Do Well
        </Text>
        <View
          accessible
          accessibilityLabel="Development setup ready"
          accessibilityRole="summary"
          style={styles.status}
        >
          <View accessibilityElementsHidden style={styles.statusDot} />
          <Text style={styles.statusText}>Development setup ready</Text>
        </View>
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
  status: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: setupTheme.color.readySurface,
    borderRadius: setupTheme.radius.status,
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    paddingHorizontal: setupTheme.spacing.content,
    paddingVertical: setupTheme.spacing.compact,
  },
  statusDot: {
    backgroundColor: setupTheme.color.ready,
    borderRadius: setupTheme.radius.status,
    height: setupTheme.spacing.compact,
    width: setupTheme.spacing.compact,
  },
  statusText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.status,
    fontWeight: "600",
  },
});
