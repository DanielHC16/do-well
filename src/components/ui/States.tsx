import { useEffect, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type DimensionValue,
} from "react-native";

import type { LoadErrorKind } from "@/shared/api/load-error";
import { AppIcon, type AppIconName } from "@/shared/ui/AppIcon";
import { motion, palette, radius, size, space, status } from "@/theme";

import { PrimaryButton, SecondaryButton } from "./Buttons";
import { useReducedMotion } from "./motion";
import { Txt } from "./Txt";

/** One shared shimmer clock so every placeholder pulses in sync. */
function useShimmer() {
  const reduced = useReducedMotion();
  const value = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (reduced) {
      value.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: motion.shimmer / 2,
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: motion.shimmer / 2,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, value]);
  return value.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
}

export function SkeletonBlock({
  width = "100%",
  height = space.md,
  rounded = radius.sm,
}: Readonly<{ width?: DimensionValue; height?: number; rounded?: number }>) {
  const opacity = useShimmer();
  return (
    <Animated.View
      style={[styles.block, { width, height, borderRadius: rounded, opacity }]}
    />
  );
}

/**
 * Content-shaped placeholders. `card` mirrors GigCard/TaskCard, `row` mirrors
 * list rows (activity), `profile` mirrors the profile header.
 */
export function Skeleton({
  shape = "card",
  count = 3,
  label = "Loading",
}: Readonly<{
  shape?: "card" | "row" | "profile";
  count?: number;
  label?: string;
}>) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
      style={styles.stack}
    >
      {Array.from({ length: shape === "profile" ? 1 : count }, (_, index) =>
        shape === "profile" ? (
          <View key={index} style={[styles.card, styles.profile]}>
            <SkeletonBlock
              width={size.avatarLarge}
              height={size.avatarLarge}
              rounded={radius.pill}
            />
            <SkeletonBlock width="50%" height={space.lg} />
            <SkeletonBlock width="35%" />
          </View>
        ) : shape === "row" ? (
          <View key={index} style={styles.row}>
            <SkeletonBlock
              width={size.avatar}
              height={size.avatar}
              rounded={radius.pill}
            />
            <View style={styles.rowText}>
              <SkeletonBlock width="70%" />
              <SkeletonBlock width="40%" height={space.sm} />
            </View>
          </View>
        ) : (
          <View key={index} style={[styles.card, styles.cardBody]}>
            <View style={styles.cardTop}>
              <SkeletonBlock width="55%" height={space.lg} />
              <SkeletonBlock width="20%" height={space.lg} />
            </View>
            <SkeletonBlock width="35%" height={space.sm} />
            <SkeletonBlock height={size.progressBar} rounded={radius.pill} />
          </View>
        ),
      )}
    </View>
  );
}

/** Icon, title, one line, one clear action (plus an optional secondary). */
export function EmptyState({
  icon = "search",
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  compact = false,
}: Readonly<{
  icon?: AppIconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Inline card: small icon beside the copy, pill actions side by side. */
  compact?: boolean;
}>) {
  if (compact) {
    return (
      <View style={[styles.card, styles.compactState]}>
        <View style={styles.compactRow}>
          <View
            style={styles.compactArt}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <AppIcon name={icon} size={size.icon} color={palette.purple} />
          </View>
          <View style={styles.compactCopy}>
            <Txt variant="title" accessibilityRole="header">
              {title}
            </Txt>
            <Txt variant="caption" tone="secondary">
              {message}
            </Txt>
          </View>
        </View>
        {actionLabel && onAction ? (
          <View style={styles.compactActions}>
            <PrimaryButton compact label={actionLabel} onPress={onAction} />
            {secondaryLabel && onSecondary ? (
              <SecondaryButton
                compact
                label={secondaryLabel}
                onPress={onSecondary}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }
  return (
    <View style={[styles.card, styles.state]}>
      <View
        style={styles.art}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <AppIcon
          name={icon}
          size={size.icon + space.xs}
          color={palette.purple}
        />
      </View>
      <Txt variant="h2" accessibilityRole="header" style={styles.centered}>
        {title}
      </Txt>
      <Txt tone="secondary" style={styles.centered}>
        {message}
      </Txt>
      {actionLabel && onAction ? (
        <View style={styles.actions}>
          <PrimaryButton label={actionLabel} onPress={onAction} />
          {secondaryLabel && onSecondary ? (
            <SecondaryButton label={secondaryLabel} onPress={onSecondary} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const ERROR_COPY: Record<
  LoadErrorKind,
  Readonly<{ title: string; icon: AppIconName; message: string }>
> = {
  offline: {
    title: "You're offline",
    icon: "wifiOff",
    message: "Check your connection, then try again.",
  },
  timeout: {
    title: "This is taking too long",
    icon: "clock",
    message: "The connection is slow right now. Try again in a moment.",
  },
  unauthorized: {
    title: "Please sign in again",
    icon: "lock",
    message: "Your session may have expired.",
  },
  server: {
    title: "Something went wrong",
    icon: "help",
    message: "We couldn't load this right now.",
  },
  invalid: {
    title: "Something went wrong",
    icon: "help",
    message: "We received data we couldn't read.",
  },
};

/**
 * The single error surface for a data view (never paired with another
 * "unavailable" line). Technical detail is collapsible and dev-builds only.
 */
export function ErrorState({
  kind = "server",
  message,
  onRetry,
  detail,
  compact = false,
}: Readonly<{
  kind?: LoadErrorKind;
  /** Screen-specific copy, e.g. "We couldn't load your work." */
  message?: string;
  onRetry?: () => void;
  detail?: string;
  /** Inline row for a secondary section that failed inside a working page. */
  compact?: boolean;
}>) {
  const copy = ERROR_COPY[kind];
  const [open, setOpen] = useState(false);
  if (compact) {
    return (
      <View style={[styles.card, styles.compactState]}>
        <View style={styles.compactRow}>
          <View
            style={[styles.compactArt, { backgroundColor: status.danger.bg }]}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <AppIcon
              name={copy.icon}
              size={size.icon}
              color={status.danger.fg}
            />
          </View>
          <View style={styles.compactCopy}>
            <Txt variant="title" accessibilityRole="header">
              {copy.title}
            </Txt>
            <Txt variant="caption" tone="secondary" accessibilityRole="alert">
              {message ?? copy.message}
            </Txt>
          </View>
        </View>
        {onRetry ? (
          <View style={styles.compactActions}>
            <SecondaryButton
              compact
              icon="refresh"
              label="Try again"
              onPress={onRetry}
            />
          </View>
        ) : null}
      </View>
    );
  }
  return (
    <View style={[styles.card, styles.state]}>
      <View
        style={[styles.art, { backgroundColor: status.danger.bg }]}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <AppIcon
          name={copy.icon}
          size={size.icon + space.xs}
          color={status.danger.fg}
        />
      </View>
      <Txt variant="h2" accessibilityRole="header" style={styles.centered}>
        {copy.title}
      </Txt>
      <Txt tone="secondary" accessibilityRole="alert" style={styles.centered}>
        {message ?? copy.message}
      </Txt>
      {onRetry ? (
        <View style={styles.actions}>
          <PrimaryButton label="Try again" icon="refresh" onPress={onRetry} />
        </View>
      ) : null}
      {__DEV__ && detail ? (
        <View style={styles.detail}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((value) => !value)}
            style={styles.detailToggle}
          >
            <Txt variant="caption" tone="secondary">
              {open ? "Hide technical detail" : "Show technical detail (dev)"}
            </Txt>
          </Pressable>
          {open ? (
            <Txt variant="caption" tone="secondary" selectable>
              {`[${kind}] ${detail}`}
            </Txt>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.sm },
  block: { backgroundColor: palette.surfaceMuted },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardBody: { padding: space.md, gap: space.sm },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  profile: { padding: space.lg, alignItems: "center", gap: space.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.xs,
  },
  rowText: { flex: 1, gap: space.xs },
  state: {
    alignItems: "center",
    padding: space.xl,
    gap: space.xs,
  },
  art: {
    width: size.avatarLarge,
    height: size.avatarLarge,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.lavender,
    marginBottom: space.xs,
  },
  centered: { textAlign: "center" },
  compactState: { padding: space.md, gap: space.md },
  compactRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  compactArt: {
    width: size.iconButton,
    height: size.iconButton,
    borderRadius: radius.pill,
    backgroundColor: palette.lavender,
    alignItems: "center",
    justifyContent: "center",
  },
  compactCopy: { flex: 1, gap: 2 },
  compactActions: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  actions: { alignSelf: "stretch", gap: space.xs, marginTop: space.sm },
  detail: { alignSelf: "stretch", marginTop: space.xs, gap: space.xxs },
  detailToggle: {
    minHeight: size.touchTarget,
    justifyContent: "center",
    alignItems: "center",
  },
});
