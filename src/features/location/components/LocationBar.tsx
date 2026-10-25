import { Pressable, StyleSheet, Text, View } from "react-native";

import { setupTheme } from "@/features/setup/setupTheme";

import type { ActiveLocation } from "../model/location-schemas";

export type LocationBarProps = Readonly<{
  activeLocation: ActiveLocation;
  radiusKm: number | null;
  onPress: () => void;
}>;

export function LocationBar({
  activeLocation,
  onPress,
  radiusKm,
}: LocationBarProps) {
  const radiusText = radiusKm ? `Within ${radiusKm} km` : "Any distance";
  const hasCoordinates =
    activeLocation.latitude !== null && activeLocation.longitude !== null;

  return (
    <Pressable
      accessibilityLabel="Location and radius filter"
      accessibilityRole="button"
      onPress={onPress}
      style={styles.container}
    >
      <View style={styles.textContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.kicker}>LOCATION & DISTANCE</Text>
          <Text
            style={[
              styles.sourceBadge,
              activeLocation.source === "gps"
                ? styles.sourceBadgeGps
                : styles.sourceBadgeManual,
            ]}
          >
            {activeLocation.source === "gps"
              ? "GPS FIX"
              : activeLocation.source === "locality"
                ? "MANUAL LOCALITY"
                : "NOT SET"}
          </Text>
        </View>

        <Text numberOfLines={1} style={styles.locationTitle}>
          {hasCoordinates
            ? activeLocation.label
            : "Set location for nearby gigs"}
        </Text>

        <Text style={styles.radiusSubtitle}>
          {hasCoordinates
            ? `Filtering: ${radiusText}`
            : "Tap to detect device GPS or pick your Metro Manila hub"}
        </Text>
      </View>

      <View style={styles.actionButton}>
        <Text style={styles.actionButtonText}>Change</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: setupTheme.spacing.section,
    paddingVertical: setupTheme.spacing.compact,
  },
  actionButtonText: {
    color: setupTheme.color.foreground,
    fontFamily: "Inter_600SemiBold",
    fontSize: setupTheme.type.caption,
  },
  container: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: setupTheme.spacing.section,
    padding: setupTheme.spacing.section,
    ...setupTheme.shadow.card,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    marginBottom: setupTheme.spacing.tight,
  },
  kicker: {
    color: setupTheme.color.muted,
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.8,
  },
  locationTitle: {
    color: setupTheme.color.foreground,
    fontFamily: "Inter_700Bold",
    fontSize: setupTheme.type.body,
    marginBottom: 2,
  },
  radiusSubtitle: {
    color: setupTheme.color.muted,
    fontFamily: "Inter_400Regular",
    fontSize: setupTheme.type.caption,
  },
  sourceBadge: {
    borderRadius: setupTheme.radius.status,
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 0.5,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sourceBadgeGps: {
    backgroundColor: setupTheme.color.readySurface,
    color: setupTheme.color.ready,
  },
  sourceBadgeManual: {
    backgroundColor: setupTheme.color.surfaceMuted,
    color: setupTheme.color.foreground,
  },
  textContainer: {
    flex: 1,
    marginRight: setupTheme.spacing.section,
  },
});
