import { memo, useEffect, useState } from "react";
import {
  Animated,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { motion, palette, radius, size, space } from "@/theme";

import { useReducedMotion } from "./motion";
import { Txt } from "./Txt";

const STRIPE_GAP = space.xs;
const STRIPE_WIDTH = 2;
const fillParent = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
} as const;

/** Diagonal stripe texture (no SVG): rotated hairlines clipped to the parent. */
export const Stripes = memo(function Stripes({
  color = palette.stripe,
}: Readonly<{ color?: string }>) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== box.width || height !== box.height) setBox({ width, height });
  };
  const span = box.width + box.height;
  const count = Math.ceil(span / STRIPE_GAP);
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.clip]}
      onLayout={onLayout}
    >
      {box.width > 0
        ? Array.from({ length: count }, (_, index) => (
            <View
              key={index}
              style={[
                styles.stripe,
                {
                  backgroundColor: color,
                  height: span,
                  left: index * STRIPE_GAP - box.height,
                  top: -box.height / 2,
                },
              ]}
            />
          ))
        : null}
    </View>
  );
});

function clamp(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

/** Filled portion in purple/accent; the remainder carries the stripe texture. */
export function ProgressBar({
  value,
  label,
  showPercent = true,
  onDark = false,
}: Readonly<{
  /** 0..1 */
  value: number;
  /** Accessible description, e.g. "2 of 5 milestones approved". */
  label: string;
  showPercent?: boolean;
  onDark?: boolean;
}>) {
  const progress = clamp(value);
  const reduced = useReducedMotion();
  const fill = useState(() => new Animated.Value(reduced ? progress : 0))[0];

  useEffect(() => {
    if (reduced) fill.setValue(progress);
    else
      Animated.timing(fill, {
        toValue: progress,
        duration: motion.slow,
        useNativeDriver: true,
      }).start();
  }, [progress, reduced, fill]);

  const percent = Math.round(progress * 100);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={styles.row}
    >
      <View
        style={[
          styles.track,
          {
            backgroundColor: onDark
              ? palette.onDarkSubtle
              : palette.surfaceMuted,
          },
        ]}
      >
        <Stripes color={onDark ? palette.onDarkSubtle : palette.stripe} />
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: onDark ? palette.mint : palette.purple,
              transform: [{ scaleX: fill }],
            },
          ]}
        />
      </View>
      {showPercent ? (
        <Txt
          variant="micro"
          tone={onDark ? "onPrimary" : "secondary"}
          style={styles.percent}
        >
          {percent}%
        </Txt>
      ) : null}
    </View>
  );
}

/**
 * Donut ring without react-native-svg (plan D3): two clipped half-rings whose
 * colored halves rotate into view. Right half covers 0–50%, left half 50–100%.
 */
export function Donut({
  value,
  label,
  diameter = size.donut,
  stroke = size.donutStroke,
  color = palette.mint,
  trackColor = palette.onDarkSubtle,
  centerTone = "onPrimary",
}: Readonly<{
  value: number;
  label: string;
  diameter?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  centerTone?: "onPrimary" | "default";
}>) {
  const progress = clamp(value);
  const percent = Math.round(progress * 100);
  const half = diameter / 2;
  const rightTurn = Math.min(progress, 0.5) * 360;
  const leftTurn = Math.max(progress - 0.5, 0) * 360;
  const ring = {
    width: diameter,
    height: diameter,
    borderRadius: half,
    borderWidth: stroke,
    position: "absolute" as const,
    top: 0,
  };

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={{ width: diameter, height: diameter }}
    >
      <View style={[ring, { left: 0, borderColor: trackColor }]} />
      {/* Right half (0–180°): colored half starts on the hidden left side. */}
      <View
        style={[styles.half, { left: half, width: half, height: diameter }]}
      >
        <View
          style={[
            ring,
            {
              left: -half,
              borderColor: "transparent",
              borderLeftColor: color,
              borderBottomColor: color,
              transform: [{ rotate: `${45 + rightTurn}deg` }],
              opacity: progress > 0 ? 1 : 0,
            },
          ]}
        />
      </View>
      {/* Left half (180–360°): colored half starts on the hidden right side. */}
      <View style={[styles.half, { left: 0, width: half, height: diameter }]}>
        <View
          style={[
            ring,
            {
              left: 0,
              borderColor: "transparent",
              borderTopColor: color,
              borderRightColor: color,
              transform: [{ rotate: `${45 + leftTurn}deg` }],
              opacity: progress > 0.5 ? 1 : 0,
            },
          ]}
        />
      </View>
      <View style={styles.center} pointerEvents="none">
        <Txt variant="h1" tone={centerTone}>
          {percent}%
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  stripe: {
    position: "absolute",
    width: STRIPE_WIDTH,
    transform: [{ rotate: "45deg" }],
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  track: {
    flex: 1,
    height: size.progressBar,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  fill: {
    ...fillParent,
    borderRadius: radius.pill,
    transformOrigin: "left",
  },
  percent: { minWidth: space.xxl, textAlign: "right" },
  half: { position: "absolute", top: 0, overflow: "hidden" },
  center: {
    ...fillParent,
    alignItems: "center",
    justifyContent: "center",
  },
});
