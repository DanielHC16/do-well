import type { TextProps } from "react-native";

import { Text } from "@/shared/ui/Typography";
import { palette, type, type TypeVariant } from "@/theme";

export type TextTone =
  | "default"
  | "secondary"
  | "tertiary"
  | "onPrimary"
  | "onPrimaryMuted"
  | "brand";

const toneColor: Record<TextTone, string> = {
  default: palette.text,
  secondary: palette.textSecondary,
  tertiary: palette.textTertiary,
  onPrimary: palette.onPrimary,
  onPrimaryMuted: palette.onDarkMuted,
  brand: palette.navy,
};

/** Themed text: every string in the redesign renders through a type variant. */
export function Txt({
  variant = "body",
  tone = "default",
  style,
  ...props
}: TextProps & { variant?: TypeVariant; tone?: TextTone }) {
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...props}
      style={[type[variant], { color: toneColor[tone] }, style]}
    />
  );
}
