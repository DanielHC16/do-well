import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon } from "@/shared/ui/AppIcon";
import { motion, palette, radius, size, space, status } from "@/theme";

import { useReducedMotion } from "./motion";
import { Txt } from "./Txt";

const DEFAULT_DURATION_MS = 3200;

/**
 * Transient confirmation above the tab bar. Controlled: the owner clears `message`
 * from `onHide`. Announced politely to screen readers.
 */
export function Toast({
  message,
  tone = "success",
  onHide,
  durationMs = DEFAULT_DURATION_MS,
}: Readonly<{
  message: string | null;
  tone?: "success" | "danger" | "info";
  onHide: () => void;
  durationMs?: number;
}>) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const opacity = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (!message) return;
    opacity.setValue(reduced ? 1 : 0);
    if (!reduced) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.fast,
        useNativeDriver: true,
      }).start();
    }
    const timer = setTimeout(onHide, durationMs);
    return () => clearTimeout(timer);
  }, [message, reduced, durationMs, onHide, opacity]);

  if (!message) return null;
  const colors = status[tone];
  return (
    <View
      pointerEvents="none"
      style={[
        styles.anchor,
        { bottom: insets.bottom + size.tabBar + space.md },
      ]}
    >
      <Animated.View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[styles.toast, { opacity }]}
      >
        <AppIcon
          name={tone === "danger" ? "help" : tone === "info" ? "info" : "check"}
          color={tone === "info" ? palette.mint : colors.border}
          size={size.iconSmall}
        />
        <Txt variant="caption" tone="onPrimary" style={styles.text}>
          {message}
        </Txt>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    maxWidth: size.contentMax,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.input,
    backgroundColor: palette.navy,
  },
  text: { flexShrink: 1 },
});
