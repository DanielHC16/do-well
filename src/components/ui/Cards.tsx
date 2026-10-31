import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { dueLabel, formatPeso } from "@/shared/format/format";
import { AppIcon } from "@/shared/ui/AppIcon";
import { elevation, palette, radius, size, space } from "@/theme";

import { AvatarStack } from "./Avatar";
import { PressableScale } from "./PressableScale";
import { ProgressBar } from "./Progress";
import { StatusBadge } from "./Status";
import { workModeBadge, type Badge } from "./status-model";
import { Txt } from "./Txt";

export type GigCardProps = Readonly<{
  title: string;
  amount: number;
  workMode: "onsite" | "remote" | "hybrid";
  /** Coarse public area only; exact addresses are never shown before selection. */
  area: string | null;
  distanceKm: number | null;
  /** e.g. "Sat, Nov 2 · 9 AM" or "Flexible". */
  schedule?: string | null;
  /** Server-provided match explanations ("Within 5 km of you"). */
  reasons?: readonly string[];
  /** TODO(data): no skills in schema yet; chips render only when provided. */
  skills?: readonly string[];
  status?: Badge;
  onPress: () => void;
}>;

function locationLine(
  workMode: GigCardProps["workMode"],
  area: string | null,
  distanceKm: number | null,
): string | null {
  if (workMode === "remote") return null;
  const distance = distanceKm === null ? null : `~${distanceKm.toFixed(1)} km`;
  return [distance, area].filter(Boolean).join(" · ") || null;
}

/** Discovery card: title + prominent ₱ pay, place, schedule, why-it-fits. */
export const GigCard = memo(function GigCard({
  title,
  amount,
  workMode,
  area,
  distanceKm,
  schedule,
  reasons = [],
  skills = [],
  status,
  onPress,
}: GigCardProps) {
  const place = locationLine(workMode, area, distanceKm);
  const pay = formatPeso(amount);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={[title, pay, place ?? workModeBadge(workMode).label]
        .filter(Boolean)
        .join(", ")}
      accessibilityHint="Opens gig details"
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.top}>
        <Txt variant="title" style={styles.title} numberOfLines={2}>
          {title}
        </Txt>
        <Txt variant="h2" style={styles.pay}>
          {pay}
        </Txt>
      </View>
      <View style={styles.meta}>
        {place ? (
          <MetaItem icon="pin" text={place} />
        ) : (
          <StatusBadge badge={workModeBadge(workMode)} />
        )}
        {place && workMode === "hybrid" ? (
          <StatusBadge badge={workModeBadge(workMode)} />
        ) : null}
        {schedule ? <MetaItem icon="calendar" text={schedule} /> : null}
        {status ? <StatusBadge badge={status} /> : null}
      </View>
      {skills.length ? (
        <View style={styles.chips}>
          {skills.slice(0, 4).map((skill) => (
            <View key={skill} style={styles.chip}>
              <Txt variant="micro" tone="secondary">
                {skill}
              </Txt>
            </View>
          ))}
        </View>
      ) : null}
      {reasons.length ? (
        <View style={styles.why}>
          <AppIcon
            name="sparkles"
            size={size.iconSmall}
            color={palette.purple}
          />
          <Txt variant="caption" style={styles.whyText} numberOfLines={2}>
            Why this fits: {reasons.join(" · ")}
          </Txt>
        </View>
      ) : null}
    </PressableScale>
  );
});

function MetaItem({
  icon,
  text,
}: Readonly<{ icon: "pin" | "calendar" | "clock" | "chat"; text: string }>) {
  return (
    <View style={styles.metaItem}>
      <AppIcon
        name={icon}
        size={size.iconSmall - 2}
        color={palette.textSecondary}
      />
      <Txt
        variant="caption"
        tone="secondary"
        numberOfLines={1}
        style={styles.shrink}
      >
        {text}
      </Txt>
    </View>
  );
}

export type TaskCardProps = Readonly<{
  title: string;
  badges: readonly Badge[];
  amount?: number | null;
  dueAt?: string | null;
  /** 0..1, only when milestones are loaded; otherwise the bar is omitted. */
  progress?: number | null;
  progressLabel?: string;
  /** TODO(data): participant names per card are not fetched yet. */
  people?: readonly string[];
  /** TODO(data): no per-assignment updates count yet. */
  updatesCount?: number | null;
  onPress: () => void;
}>;

/** Work item card: badges, striped progress, people, due date, updates. */
export const TaskCard = memo(function TaskCard({
  title,
  badges,
  amount,
  dueAt,
  progress,
  progressLabel,
  people = [],
  updatesCount,
  onPress,
}: TaskCardProps) {
  const due = dueLabel(dueAt);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={[
        title,
        badges.map((badge) => badge.label).join(", "),
        amount ? formatPeso(amount) : null,
        due,
      ]
        .filter(Boolean)
        .join(", ")}
      accessibilityHint="Opens the task workspace"
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.top}>
        <Txt variant="title" style={styles.title} numberOfLines={2}>
          {title}
        </Txt>
        {amount ? (
          <Txt variant="bodyStrong" style={styles.pay}>
            {formatPeso(amount)}
          </Txt>
        ) : null}
      </View>
      {badges.length ? (
        <View style={styles.chips}>
          {badges.map((badge) => (
            <StatusBadge key={badge.label} badge={badge} />
          ))}
        </View>
      ) : null}
      {progress !== null && progress !== undefined ? (
        <ProgressBar
          value={progress}
          label={progressLabel ?? `${Math.round(progress * 100)}% complete`}
        />
      ) : null}
      <View style={styles.footer}>
        {people.length ? <AvatarStack names={people} /> : null}
        <View style={styles.footerMeta}>
          <MetaItem icon="calendar" text={due} />
          {updatesCount ? (
            <MetaItem
              icon="chat"
              text={`${updatesCount} update${updatesCount === 1 ? "" : "s"}`}
            />
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: space.md,
    gap: space.sm,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    ...elevation.card,
  },
  top: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  title: { flex: 1 },
  pay: { color: palette.navy },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xxs,
    maxWidth: "100%",
  },
  shrink: { flexShrink: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  chip: {
    paddingHorizontal: space.sm - 2,
    paddingVertical: space.xxs,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceMuted,
  },
  why: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    padding: space.sm,
    borderRadius: radius.input,
    backgroundColor: palette.lavender,
  },
  whyText: { flex: 1, color: palette.purple },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: space.sm,
  },
  footerMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    marginLeft: "auto",
  },
});
