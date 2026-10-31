import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated } from "react-native";

import { motion } from "@/theme";

/** Tracks the OS "remove animations" setting; motion collapses to instant when on. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);
  return reduced;
}

/** Native-driver press scale (0.98). Built on core Animated so Jest can render it. */
export function usePressScale() {
  const reduced = useReducedMotion();
  const scale = useState(() => new Animated.Value(1))[0];
  const to = (value: number) => {
    if (reduced) return;
    Animated.timing(scale, {
      toValue: value,
      duration: motion.fast,
      useNativeDriver: true,
    }).start();
  };
  return {
    style: { transform: [{ scale }] },
    onPressIn: () => to(motion.pressScale),
    onPressOut: () => to(1),
  };
}
