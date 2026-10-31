import { memo, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { palette, radius, size, space } from "@/theme";

import { PressableScale } from "./PressableScale";
import { Donut, Stripes } from "./Progress";
import { Txt } from "./Txt";

/** White tile on teal with stripe texture. Tapping applies its filter. */
export const StatTile = memo(function StatTile({
  value,
  label,
  onPress,
  selected = false,
}: Readonly<{
  /** Pre-formatted (e.g. "20+") so pagination limits stay honest. */
  value: string;
  label: string;
  onPress?: () => void;
  selected?: boolean;
}>) {
  const body = (
    <>
      <Stripes />
      <Txt variant="h1" style={styles.value} numberOfLines={1}>
        {value}
      </Txt>
      <Txt variant="caption" tone="secondary" numberOfLines={2}>
        {label}
      </Txt>
    </>
  );
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
      accessibilityHint={onPress ? "Shows these items" : undefined}
      accessibilityState={{ selected, disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      containerStyle={styles.tileContainer}
      style={[styles.tile, selected && styles.tileSelected]}
    >
      {body}
    </PressableScale>
  );
});

/** Responsive 2-column grid (4 tiles → 2×2; 3 tiles → 2+1 full width). */
export function StatGrid({ children }: Readonly<{ children: ReactNode }>) {
  return <View style={styles.grid}>{children}</View>;
}

export type MiniStat = Readonly<{ value: string; label: string }>;

/** Dark hero card: lime donut + up to three mini stats. */
export function ProgressHeroCard({
  title,
  subtitle,
  progress,
  progressLabel,
  stats,
}: Readonly<{
  title: string;
  subtitle?: string;
  /** 0..1 */
  progress: number;
  /** Accessible description, e.g. "3 of 5 milestones approved this week". */
  progressLabel: string;
  stats: readonly MiniStat[];
}>) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <View style={styles.heroCopy}>
          <Txt variant="h2" tone="onPrimary" accessibilityRole="header">
            {title}
          </Txt>
          {subtitle ? (
            <Txt variant="caption" tone="onPrimaryMuted">
              {subtitle}
            </Txt>
          ) : null}
        </View>
        <Donut value={progress} label={progressLabel} />
      </View>
      <View style={styles.miniRow}>
        {stats.slice(0, 3).map((stat) => (
          <View
            key={stat.label}
            accessible
            accessibilityLabel={`${stat.value} ${stat.label}`}
            style={styles.mini}
          >
            <View style={styles.miniDot} />
            <Txt variant="title" tone="onPrimary">
              {stat.value}
            </Txt>
            <Txt variant="micro" tone="onPrimaryMuted" numberOfLines={2}>
              {stat.label}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  tileContainer: { flexGrow: 1, flexBasis: "45%" },
  tile: {
    minHeight: size.statTile,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: 2,
    borderRadius: radius.input,
    backgroundColor: palette.surface,
    justifyContent: "center",
  },
  tileSelected: { borderWidth: 2, borderColor: palette.mint },
  value: { color: palette.navy },
  hero: {
    backgroundColor: palette.navy,
    borderRadius: radius.hero,
    padding: space.lg,
    gap: space.lg,
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  heroCopy: { flex: 1, gap: space.xxs },
  miniRow: { flexDirection: "row", gap: space.sm },
  mini: {
    flex: 1,
    gap: space.xxs,
    padding: space.sm,
    borderRadius: radius.input,
    backgroundColor: palette.onDarkSubtle,
  },
  miniDot: {
    width: size.dot,
    height: size.dot,
    borderRadius: radius.pill,
    backgroundColor: palette.mint,
  },
});
