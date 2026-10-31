import { memo, type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { dueLabel } from "@/shared/format/format";
import { AppIcon } from "@/shared/ui/AppIcon";
import { palette, radius, size, space, status } from "@/theme";

import { PressableScale } from "./PressableScale";
import { StatusBadge } from "./Status";
import { badgeFor } from "./status-model";
import { Txt } from "./Txt";

export type TimelineItem = Readonly<{
  id: string;
  title: string;
  /** Milestone status from the backend (pending, in_progress, …). */
  status: string;
  dueAt?: string | null;
  description?: string | null;
}>;

/** Vertical milestone timeline. `renderAction` adds per-step controls. */
export function MilestoneTimeline({
  items,
  renderAction,
}: Readonly<{
  items: readonly TimelineItem[];
  renderAction?: (item: TimelineItem) => ReactNode;
}>) {
  return (
    <View accessibilityRole="list" style={styles.timeline}>
      {items.map((item, index) => {
        const badge = badgeFor("milestone", item.status);
        const done = item.status === "approved";
        const last = index === items.length - 1;
        return (
          <View key={item.id} style={styles.step}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.node,
                  {
                    backgroundColor: done ? palette.purple : palette.surface,
                    borderColor: done
                      ? palette.purple
                      : status[badge.tone].base,
                  },
                ]}
              >
                {done ? (
                  <AppIcon
                    name="tick"
                    size={size.iconSmall - 4}
                    color={palette.onPrimary}
                  />
                ) : null}
              </View>
              {last ? null : (
                <View
                  style={[
                    styles.line,
                    done && { backgroundColor: palette.purple },
                  ]}
                />
              )}
            </View>
            <View
              accessible
              accessibilityLabel={`Step ${index + 1}: ${item.title}, ${badge.label}, ${dueLabel(item.dueAt)}`}
              style={styles.stepBody}
            >
              <Txt variant="title">{item.title}</Txt>
              <View style={styles.stepMeta}>
                <StatusBadge badge={badge} />
                <Txt variant="caption" tone="secondary">
                  {dueLabel(item.dueAt)}
                </Txt>
              </View>
              {item.description ? (
                <Txt variant="caption" tone="secondary">
                  {item.description}
                </Txt>
              ) : null}
            </View>
            {renderAction ? (
              <View style={styles.stepAction}>{renderAction(item)}</View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** 7-day strip starting on `weekStart`'s Monday. Selected day = dark circle. */
export const WeekStrip = memo(function WeekStrip({
  selected,
  onSelect,
  markedDates = [],
}: Readonly<{
  selected: Date;
  onSelect: (date: Date) => void;
  /** Days with milestones due get a small dot. */
  markedDates?: readonly Date[];
}>) {
  const anchor = startOfDay(selected);
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, offset) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + offset);
    return day;
  });
  const today = new Date();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.week}
      accessibilityRole="tablist"
      accessibilityLabel="Choose a day"
    >
      {days.map((day) => {
        const isSelected = sameDay(day, selected);
        const marked = markedDates.some((date) => sameDay(date, day));
        const weekday = day.toLocaleDateString("en-PH", { weekday: "short" });
        return (
          <PressableScale
            key={day.toISOString()}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${day.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}${marked ? ", has due work" : ""}${sameDay(day, today) ? ", today" : ""}`}
            onPress={() => onSelect(day)}
            containerStyle={styles.dayContainer}
            style={styles.day}
          >
            <Txt variant="micro" tone="secondary">
              {weekday}
            </Txt>
            <View style={[styles.date, isSelected && styles.dateSelected]}>
              <Txt variant="title" tone={isSelected ? "onPrimary" : "default"}>
                {day.getDate()}
              </Txt>
            </View>
            <View
              style={[
                styles.mark,
                marked && { backgroundColor: palette.purple },
              ]}
            />
          </PressableScale>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  timeline: { gap: 0 },
  step: { flexDirection: "row", gap: space.sm },
  rail: { alignItems: "center", width: size.icon },
  node: {
    width: size.icon,
    height: size.icon,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  line: {
    flex: 1,
    width: 2,
    minHeight: space.lg,
    backgroundColor: palette.border,
  },
  stepBody: { flex: 1, gap: space.xxs, paddingBottom: space.lg },
  stepMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: space.xs,
  },
  stepAction: { justifyContent: "flex-start" },
  week: { gap: space.xs, paddingVertical: space.xxs },
  dayContainer: { minWidth: size.touchTarget },
  day: {
    alignItems: "center",
    gap: space.xxs,
    paddingVertical: space.xs,
    borderRadius: radius.input,
  },
  date: {
    width: size.iconButton,
    height: size.iconButton,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  dateSelected: { backgroundColor: palette.navy },
  mark: {
    width: size.dot,
    height: size.dot,
    borderRadius: radius.pill,
    backgroundColor: "transparent",
  },
});
