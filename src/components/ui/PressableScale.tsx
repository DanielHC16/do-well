import type { PropsWithChildren } from "react";
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { palette } from "@/theme";

import { usePressScale } from "./motion";

type Props = PropsWithChildren<
  Omit<PressableProps, "style" | "children"> & {
    /** Visual style of the control (padding, background, radius). */
    style?: StyleProp<ViewStyle>;
    /** Outer layout (flex, width, alignSelf, margins). */
    containerStyle?: StyleProp<ViewStyle>;
    rippleColor?: string;
  }
>;

/** Android ripple + 0.98 press scale. All tappable UI builds on this. */
export function PressableScale({
  style,
  containerStyle,
  children,
  rippleColor = palette.stripe,
  onPressIn,
  onPressOut,
  ...props
}: Props) {
  const press = usePressScale();
  return (
    <Animated.View style={[containerStyle, press.style]}>
      <Pressable
        {...props}
        android_ripple={{ color: rippleColor }}
        onPressIn={(event) => {
          press.onPressIn();
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          press.onPressOut();
          onPressOut?.(event);
        }}
        // overflow hidden clips the Android ripple to the control's radius.
        style={[{ overflow: "hidden" }, style]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
