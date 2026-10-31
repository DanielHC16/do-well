import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/shared/ui/Typography";

import { setupTheme } from "@/features/setup/setupTheme";
import { AppIcon } from "@/shared/ui/AppIcon";

import type { ActiveLocation } from "../model/location-schemas";

export type LocationBarProps = Readonly<{
  activeLocation: ActiveLocation;
  radiusKm: number | null;
  onPress: () => void;
  compact?: boolean;
}>;

export function LocationBar({
  activeLocation,
  onPress,
  radiusKm,
  compact = false,
}: LocationBarProps) {
  const radiusText = radiusKm ? `Within ${radiusKm} km` : "Any distance";
  const hasCoordinates =
    activeLocation.latitude !== null && activeLocation.longitude !== null;

  return (
    <Pressable
      accessibilityLabel="Location and radius filter"
      accessibilityRole="button"
      accessibilityValue={{
        text: hasCoordinates
          ? `${activeLocation.label}, ${radiusText}`
          : "No area selected. Location is optional; remote gigs are available.",
      }}
      onPress={onPress}
      style={[styles.container, compact && styles.compact]}
    >
      <AppIcon name="pin" size={18} color={setupTheme.color.primary} />
      <View style={styles.textContainer}>
        <Text
          numberOfLines={compact ? 2 : undefined}
          style={[styles.locationTitle, compact && styles.compactTitle]}
        >
          {hasCoordinates
            ? activeLocation.label
            : compact
              ? "Choose area"
              : "Choose an area"}
        </Text>
        {!compact || hasCoordinates ? (
          <Text style={styles.radiusSubtitle}>
            {hasCoordinates ? radiusText : "Optional · Remote gigs available"}
          </Text>
        ) : null}
      </View>
      {!compact ? (
        <AppIcon name="chevronRight" size={18} color={setupTheme.color.muted} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  compact: {
    width: 132,
    backgroundColor: setupTheme.color.surface,
    borderWidth: 1,
    borderColor: setupTheme.color.border,
    paddingHorizontal: setupTheme.spacing.compact,
    borderRadius: setupTheme.radius.control,
    flexShrink: 0,
  },
  compactTitle: {
    fontSize: setupTheme.type.caption,
    color: setupTheme.color.primary,
  },
  container: {
    alignItems: "center",
    backgroundColor: setupTheme.color.background,
    borderRadius: setupTheme.radius.control,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: setupTheme.size.touchTarget,
    gap: setupTheme.spacing.compact,
    paddingVertical: setupTheme.spacing.compact,
  },
  locationTitle: {
    color: setupTheme.color.foreground,
    fontWeight: "500",
    fontSize: setupTheme.type.body,
  },
  radiusSubtitle: {
    color: setupTheme.color.muted,
    fontWeight: "400",
    fontSize: setupTheme.type.caption,
  },
  textContainer: {
    flex: 1,
    gap: setupTheme.spacing.tight,
  },
});
