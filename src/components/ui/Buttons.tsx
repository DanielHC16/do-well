import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppIcon, type AppIconName } from "@/shared/ui/AppIcon";
import { palette, radius, size, space, status } from "@/theme";

import { PressableScale } from "./PressableScale";
import { Txt } from "./Txt";

type ButtonProps = Readonly<{
  label: string;
  onPress: () => void;
  icon?: AppIconName;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Destructive secondary action (e.g. withdraw). */
  tone?: "default" | "danger";
}>;

/** 56dp full-width primary CTA on navy; `compact` = 48dp content-width pill. */
export function PrimaryButton({
  label,
  onPress,
  icon,
  loading = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  compact = false,
}: ButtonProps & { compact?: boolean }) {
  const blocked = loading || disabled;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      rippleColor={palette.onDarkSubtle}
      containerStyle={compact ? styles.compactContainer : undefined}
      style={[
        styles.base,
        compact ? styles.compact : null,
        styles.primary,
        blocked && styles.blocked,
      ]}
    >
      <ButtonContent
        label={label}
        icon={icon}
        loading={loading}
        color={palette.onPrimary}
      />
    </PressableScale>
  );
}

/** Outlined secondary action; `tone="danger"` for destructive choices. */
export function SecondaryButton({
  label,
  onPress,
  icon,
  loading = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  tone = "default",
  compact = false,
}: ButtonProps & { compact?: boolean }) {
  const blocked = loading || disabled;
  const color = tone === "danger" ? status.danger.fg : palette.navy;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      containerStyle={compact ? styles.compactContainer : undefined}
      style={[
        styles.base,
        compact ? styles.compact : null,
        tone === "danger" ? styles.danger : styles.secondary,
        blocked && styles.blocked,
      ]}
    >
      <ButtonContent
        label={label}
        icon={icon}
        loading={loading}
        color={color}
      />
    </PressableScale>
  );
}

function ButtonContent({
  label,
  icon,
  loading,
  color,
}: Readonly<{
  label: string;
  icon?: AppIconName;
  loading: boolean;
  color: string;
}>) {
  return (
    <View style={styles.content}>
      {loading ? <ActivityIndicator color={color} /> : null}
      {icon && !loading ? (
        <AppIcon name={icon} color={color} size={size.iconSmall} />
      ) : null}
      <Txt variant="bodyStrong" style={[styles.label, { color }]}>
        {label}
      </Txt>
    </View>
  );
}

/** Circular icon-only control. Visual size 44, touch target >= 48 via hitSlop. */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = "surface",
  badge = false,
  disabled = false,
}: Readonly<{
  icon: AppIconName;
  accessibilityLabel: string;
  onPress: () => void;
  variant?: "surface" | "muted";
  /** Small red dot (e.g. unread notifications). */
  badge?: boolean;
  disabled?: boolean;
}>) {
  return (
    <View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={
          badge ? `${accessibilityLabel}, new items` : accessibilityLabel
        }
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        hitSlop={(size.touchTarget - size.iconButton) / 2}
        style={[
          styles.icon,
          variant === "muted" ? styles.iconMuted : styles.iconSurface,
          disabled && styles.blocked,
        ]}
      >
        <AppIcon name={icon} size={size.icon} color={palette.navy} />
      </PressableScale>
      {badge ? <View style={styles.badge} pointerEvents="none" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: size.primaryButton,
    borderRadius: radius.input,
    paddingHorizontal: space.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: palette.navy },
  secondary: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  danger: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  compact: { minHeight: size.touchTarget, borderRadius: radius.pill },
  compactContainer: { alignSelf: "flex-start" },
  blocked: { opacity: 0.5 },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
  },
  label: { textAlign: "center", flexShrink: 1 },
  icon: {
    width: size.iconButton,
    height: size.iconButton,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSurface: { backgroundColor: palette.surface },
  iconMuted: { backgroundColor: palette.surfaceMuted },
  badge: {
    position: "absolute",
    top: space.xs,
    right: space.xs,
    width: space.xs,
    height: space.xs,
    borderRadius: radius.pill,
    backgroundColor: palette.badge,
    borderWidth: 1.5,
    borderColor: palette.surface,
  },
});
