import { StyleSheet, Text, View } from "react-native";

import { setupTheme } from "@/features/setup/setupTheme";

export function DemoBanner() {
  return (
    <View accessibilityRole="summary" style={styles.banner}>
      <View style={styles.dot} />
      <Text style={styles.label}>DEMO MODE - LOCAL DATA</Text>
      <Text style={styles.detail}>No account needed</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    backgroundColor: setupTheme.color.highlightSurface,
    borderBottomColor: setupTheme.color.border,
    borderBottomWidth: 2,
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    paddingHorizontal: setupTheme.spacing.section,
    paddingVertical: setupTheme.spacing.compact,
  },
  dot: {
    backgroundColor: setupTheme.color.accent,
    borderRadius: setupTheme.radius.status,
    height: 9,
    width: 9,
  },
  label: {
    color: setupTheme.color.foreground,
    flex: 1,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  detail: {
    color: setupTheme.color.warning,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
  },
});
