import { StyleSheet, View } from "react-native";

import { radius, size, space, status, type StatusTone } from "@/theme";

import type { Badge } from "./status-model";
import { Txt } from "./Txt";

/** Tinted pill: ~12% tint, soft outline, AA-contrast text. */
export function StatusBadge({ badge }: Readonly<{ badge: Badge }>) {
  const colors = status[badge.tone];
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Status: ${badge.label}`}
      style={[
        styles.badge,
        { backgroundColor: colors.bg, borderColor: colors.border },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: colors.base }]} />
      <Txt variant="micro" numberOfLines={1} style={{ color: colors.fg }}>
        {badge.label}
      </Txt>
    </View>
  );
}

export type Priority = "low" | "medium" | "high";
const PRIORITY_TONE: Record<Priority, StatusTone> = {
  low: "success",
  medium: "warning",
  high: "danger",
};

/**
 * Small colored dot + label.
 * TODO(data): gigs have no priority column; built for later use, not wired.
 */
export function PriorityDot({ priority }: Readonly<{ priority: Priority }>) {
  const colors = status[PRIORITY_TONE[priority]];
  const label = `${priority.charAt(0).toUpperCase()}${priority.slice(1)} priority`;
  return (
    <View accessibilityLabel={label} style={styles.priority}>
      <View style={[styles.dot, { backgroundColor: colors.base }]} />
      <Txt variant="micro" style={{ color: colors.fg }}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: space.xxs + 2,
    paddingHorizontal: space.sm - 2,
    paddingVertical: space.xxs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dot: { width: size.dot, height: size.dot, borderRadius: radius.pill },
  priority: { flexDirection: "row", alignItems: "center", gap: space.xxs + 2 },
});
