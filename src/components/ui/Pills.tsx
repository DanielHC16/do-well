import { useEffect, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { AppIcon, type AppIconName } from "@/shared/ui/AppIcon";
import { motion, palette, radius, size, space } from "@/theme";

import { useReducedMotion } from "./motion";
import { PressableScale } from "./PressableScale";
import { Txt } from "./Txt";

/** Pill chip for filters. Selected = purple fill with white label. */
export function FilterPill({
  label,
  selected,
  onPress,
  icon,
  trailingIcon,
  accessibilityLabel,
  grow = false,
}: Readonly<{
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: AppIconName;
  trailingIcon?: AppIconName;
  accessibilityLabel?: string;
  /** Share the row width equally (used for All / On-site / Remote). */
  grow?: boolean;
}>) {
  const color = selected ? palette.onPrimary : palette.text;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={space.xxs}
      containerStyle={grow ? styles.grow : undefined}
      rippleColor={selected ? palette.onDarkSubtle : palette.stripe}
      style={[styles.pill, selected ? styles.selected : styles.idle]}
    >
      {icon ? (
        <AppIcon name={icon} size={size.iconSmall} color={color} />
      ) : null}
      <Txt
        variant="caption"
        numberOfLines={1}
        style={[styles.label, { color }]}
      >
        {label}
      </Txt>
      {trailingIcon ? (
        <AppIcon name={trailingIcon} size={size.iconSmall} color={color} />
      ) : null}
    </PressableScale>
  );
}

export type Segment<T extends string> = Readonly<{
  value: T;
  label: string;
  /** Optional count shown after the label. */
  count?: number;
  /** Screen-reader name when it should differ from the visible label. */
  accessibilityLabel?: string;
}>;

/**
 * Segmented control with a sliding filled indicator. Equal-width, never scrolls.
 * `light`: purple indicator on a lavender track (screens).
 * `onDark`: white indicator on a translucent track (navy header mode switch).
 */
export function SegmentedPills<T extends string>({
  segments,
  value,
  onChange,
  accessibilityLabel,
  tone = "light",
  role = "tab",
  disabled = false,
}: Readonly<{
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  tone?: "light" | "onDark";
  /** `radio` for exclusive settings (workspace mode), `tab` for views. */
  role?: "tab" | "radio";
  disabled?: boolean;
}>) {
  const onDark = tone === "onDark";
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    segments.findIndex((segment) => segment.value === value),
  );
  const segmentWidth = width / Math.max(segments.length, 1);
  const position = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    const toValue = index * segmentWidth;
    if (reduced) position.setValue(toValue);
    else
      Animated.timing(position, {
        toValue,
        duration: motion.base,
        useNativeDriver: true,
      }).start();
  }, [index, segmentWidth, reduced, position]);

  return (
    <View
      accessibilityRole={role === "radio" ? "radiogroup" : "tablist"}
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, onDark && styles.trackOnDark]}
      onLayout={(event: LayoutChangeEvent) =>
        setWidth(event.nativeEvent.layout.width - space.xxs * 2)
      }
    >
      {width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            onDark && styles.indicatorOnDark,
            { width: segmentWidth, transform: [{ translateX: position }] },
          ]}
        />
      ) : null}
      {segments.map((segment) => {
        const selected = segment.value === value;
        const label =
          segment.count === undefined
            ? segment.label
            : `${segment.label} ${segment.count}`;
        const color = onDark
          ? selected
            ? palette.navy
            : palette.onDarkMuted
          : selected
            ? palette.onPrimary
            : palette.textSecondary;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole={role}
            accessibilityState={
              role === "radio"
                ? {
                    checked: selected,
                    selected,
                    disabled: disabled || selected,
                  }
                : { selected, disabled }
            }
            accessibilityLabel={segment.accessibilityLabel ?? label}
            disabled={disabled || (role === "radio" && selected)}
            onPress={() => onChange(segment.value)}
            hitSlop={{ top: space.xxs, bottom: space.xxs }}
            android_ripple={{
              color: onDark ? palette.onDarkSubtle : palette.stripe,
            }}
            style={styles.segment}
          >
            <Txt
              variant="caption"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={[styles.segmentLabel, { color }]}
            >
              {label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  pill: {
    minHeight: size.touchTarget - space.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xxs + 2,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  idle: { backgroundColor: palette.lavender, borderColor: palette.lavender },
  selected: {
    backgroundColor: palette.purple,
    borderColor: palette.purple,
  },
  label: { fontWeight: "500", flexShrink: 1 },
  track: {
    flexDirection: "row",
    padding: space.xxs,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceMuted,
  },
  trackOnDark: { backgroundColor: palette.onDarkSubtle },
  indicator: {
    position: "absolute",
    top: space.xxs,
    bottom: space.xxs,
    left: space.xxs,
    borderRadius: radius.pill,
    backgroundColor: palette.purple,
  },
  indicatorOnDark: { backgroundColor: palette.surface },
  segment: {
    flex: 1,
    minHeight: size.touchTarget - space.xs,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xs,
    borderRadius: radius.pill,
  },
  segmentLabel: { fontWeight: "600", textAlign: "center" },
});
