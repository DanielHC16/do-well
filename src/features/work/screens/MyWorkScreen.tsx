import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "@/shared/ui/Typography";

import { setupTheme } from "@/features/setup/setupTheme";
import {
  MarketplaceShell,
  marketplaceStyles,
} from "@/features/shell/components/MarketplaceShell";
import type { ShellMode } from "@/features/shell/model/shell-mode";
import {
  AppButton,
  AppText,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  StatusBadge,
} from "@/shared/ui";
import { AppIcon } from "@/shared/ui/AppIcon";
import {
  WORK_PAGE_SIZE,
  workGateway,
  type WorkGateway,
  type WorkItem,
  type WorkSection,
} from "../data/work-gateway";

export function MyWorkScreen({
  userId,
  mode,
  gateway = workGateway,
}: Readonly<{ userId: string; mode: ShellMode; gateway?: WorkGateway }>) {
  const router = useRouter();
  const firstSection = mode === "worker" ? "applications" : "listings";
  const [section, setSection] = useState<WorkSection>(firstSection);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [nextOffset, setNextOffset] = useState(0);
  const generation = useRef(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(
    (offset: number) => {
      const request = ++generation.current;
      setBusy(true);
      setError(false);
      if (offset === 0) setItems([]);
      void gateway
        .list(userId, mode, section, offset)
        .then((rows) => {
          if (request !== generation.current) return;
          setItems((previous) =>
            offset === 0
              ? rows
              : [
                  ...previous,
                  ...rows.filter(
                    (row) => !previous.some((item) => item.id === row.id),
                  ),
                ],
          );
          setNextOffset(offset + WORK_PAGE_SIZE);
          setHasMore(rows.length === WORK_PAGE_SIZE);
        })
        .catch(() => {
          if (request === generation.current) setError(true);
        })
        .finally(() => {
          if (request === generation.current) setBusy(false);
        });
    },
    [gateway, mode, section, userId],
  );

  // Returning from a detail screen reloads the first page so statuses remain authoritative.
  useFocusEffect(
    useCallback(() => {
      load(0);
      return () => {
        generation.current += 1;
      };
    }, [load]),
  );

  function chooseSection(next: WorkSection) {
    if (next === section) return;
    setItems([]);
    setBusy(true);
    setError(false);
    setSection(next);
  }
  function reload() {
    load(0);
  }
  function open(item: WorkItem) {
    if (item.kind === "assignment")
      router.push(`/(protected)/${mode}/assignments/${item.id}`);
    else router.push(`/(protected)/${mode}/gigs/${item.gigId}`);
  }
  const tabs: { key: WorkSection; label: string }[] = [
    {
      key: firstSection,
      label: mode === "worker" ? "Applications" : "My listings",
    },
    { key: "active", label: "Active work" },
    { key: "completed", label: "Completed" },
  ];
  const emptyTitle =
    section === "applications"
      ? "No applications yet"
      : section === "listings"
        ? "No listings yet"
        : section === "completed"
          ? "No completed work yet"
          : "No active work yet";

  return (
    <MarketplaceShell
      activeSection="work"
      compactHeader
      title="My work"
      subtitle="Your applications, active gigs, and completed work."
      scrollable={false}
      listContent={(heading) => (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.header}>
              {heading}
              <ScrollView
                testID="work-section-tabs"
                horizontal
                persistentScrollbar
                showsHorizontalScrollIndicator
                keyboardShouldPersistTaps="handled"
                style={styles.tabStrip}
                contentContainerStyle={styles.tabs}
              >
                {tabs.map((tab) => (
                  <Pressable
                    key={tab.key}
                    accessibilityRole="button"
                    accessibilityLabel={tab.label}
                    accessibilityState={{ selected: section === tab.key }}
                    onPress={() => chooseSection(tab.key)}
                    style={[
                      styles.sectionTab,
                      section === tab.key && styles.sectionTabSelected,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.sectionTabText,
                        section === tab.key && styles.sectionTabTextSelected,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.listSummary}>
                <AppText
                  tone="muted"
                  variant="caption"
                  style={styles.summaryText}
                >
                  {busy && items.length === 0
                    ? `Loading ${workSectionNouns[section][1]}…`
                    : error && items.length === 0
                      ? "This work view is unavailable"
                      : loadedWorkSummary(section, items.length)}
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Refresh work"
                  disabled={busy}
                  accessibilityState={{ disabled: busy, busy }}
                  onPress={reload}
                  style={styles.refreshButton}
                >
                  {busy ? (
                    <ActivityIndicator color={setupTheme.color.primary} />
                  ) : (
                    <AppIcon name="refresh" size={20} />
                  )}
                </Pressable>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={workItemLabel(item)}
              accessibilityHint={
                item.kind === "assignment"
                  ? "Opens agreement and milestones."
                  : "Opens gig details."
              }
              onPress={() => open(item)}
              style={[
                marketplaceStyles.card,
                styles.workCard,
                item.status === "completed" && styles.completedCard,
              ]}
            >
              <View style={styles.cardHeading}>
                <View style={styles.workTile}>
                  <AppIcon
                    name={
                      item.kind === "assignment"
                        ? "briefcase"
                        : item.kind === "application"
                          ? "file"
                          : "layers"
                    }
                    size={20}
                  />
                </View>
                <AppText style={styles.workTitle}>{item.title}</AppText>
                <AppIcon name="chevronRight" size={18} />
              </View>
              <View style={styles.metadataRow}>
                <StatusBadge
                  label={statusLabel(item.status)}
                  tone={
                    item.status === "completed" || item.status === "accepted"
                      ? "success"
                      : "neutral"
                  }
                />
                {item.amount !== null ? (
                  <AppText style={styles.compensation}>
                    {new Intl.NumberFormat("en-PH", {
                      style: "currency",
                      currency: "PHP",
                      maximumFractionDigits: 2,
                    }).format(item.amount)}
                  </AppText>
                ) : null}
                {item.dueAt ? (
                  <View style={styles.deadline}>
                    <AppIcon
                      name="clock"
                      size={16}
                      color={setupTheme.color.muted}
                    />
                    <AppText tone="muted" variant="caption">
                      Due {new Date(item.dueAt).toLocaleDateString("en-PH")}
                    </AppText>
                  </View>
                ) : null}
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            !busy && !error ? (
              <EmptyState
                kind="work"
                title={emptyTitle}
                message={
                  section === "completed"
                    ? "Approved work appears here."
                    : mode === "worker"
                      ? "Browse gigs to get started."
                      : "Post a gig to find help."
                }
                actionLabel={mode === "worker" ? "Discover gigs" : "Post a gig"}
                onAction={() =>
                  router.push(
                    mode === "worker"
                      ? "/(protected)/worker"
                      : "/(protected)/employer/gigs/new",
                  )
                }
              />
            ) : undefined
          }
          ListFooterComponent={
            <View style={styles.header}>
              {busy ? <LoadingSkeleton label="Loading your work…" /> : null}
              {error ? (
                <ErrorState
                  message="We couldn't load your work. Try again."
                  onRetry={() => load(items.length === 0 ? 0 : nextOffset)}
                />
              ) : null}
              {!busy && !error && hasMore ? (
                <AppButton
                  label="Load more work"
                  icon="arrowRight"
                  onPress={() => load(nextOffset)}
                  variant="secondary"
                />
              ) : null}
            </View>
          }
        />
      )}
    />
  );
}

const workSectionNouns: Record<WorkSection, readonly [string, string]> = {
  applications: ["application", "applications"],
  listings: ["listing", "listings"],
  active: ["active assignment", "active assignments"],
  completed: ["completed assignment", "completed assignments"],
};

function loadedWorkSummary(section: WorkSection, count: number) {
  return `${count} ${workSectionNouns[section][count === 1 ? 0 : 1]} loaded`;
}

function statusLabel(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function workItemLabel(item: WorkItem) {
  const compensation =
    item.amount === null
      ? ""
      : new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: "PHP",
        }).format(item.amount);
  const deadline = item.dueAt
    ? `Due ${new Date(item.dueAt).toLocaleDateString("en-PH")}`
    : "";
  return [
    `Open ${item.title}`,
    statusLabel(item.status),
    compensation,
    deadline,
  ]
    .filter(Boolean)
    .join(". ");
}
const styles = StyleSheet.create({
  compensation: {
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
  },
  workCard: {
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.compact + setupTheme.spacing.tight,
  },
  completedCard: {
    borderLeftColor: setupTheme.color.ready,
    borderLeftWidth: 3,
  },
  workTitle: {
    flex: 1,
    fontSize: setupTheme.type.cardTitle,
    lineHeight: 22,
    fontWeight: "600",
  },
  listSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: setupTheme.spacing.compact,
  },
  summaryText: { flex: 1 },
  refreshButton: {
    minHeight: setupTheme.size.touchTarget,
    minWidth: setupTheme.size.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: setupTheme.radius.control,
    backgroundColor: setupTheme.color.accentSurface,
  },
  cardHeading: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: setupTheme.spacing.compact,
  },
  workTile: {
    minWidth: setupTheme.size.avatar,
    minHeight: setupTheme.size.avatar,
    padding: setupTheme.spacing.compact,
    borderRadius: setupTheme.radius.control,
    backgroundColor: setupTheme.color.accentSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: setupTheme.spacing.compact,
  },
  deadline: {
    flexDirection: "row",
    alignItems: "center",
    gap: setupTheme.spacing.tight,
  },
  content: {
    alignSelf: "center",
    width: "100%",
    maxWidth: setupTheme.size.contentMax,
    padding: setupTheme.spacing.section,
    gap: setupTheme.spacing.compact,
    paddingBottom: setupTheme.spacing.generous,
  },
  header: { gap: setupTheme.spacing.compact },
  tabs: {
    flexDirection: "row",
    flexGrow: 1,
    gap: setupTheme.spacing.tight,
    padding: setupTheme.spacing.tight,
    paddingBottom: setupTheme.spacing.compact,
  },
  tabStrip: {
    flexGrow: 0,
    backgroundColor: setupTheme.color.accentSurface,
    borderRadius: setupTheme.radius.control,
  },
  sectionTab: {
    flexShrink: 0,
    minWidth: setupTheme.size.touchTarget,
    minHeight: setupTheme.size.touchTarget,
    padding: setupTheme.spacing.compact,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: setupTheme.radius.small,
  },
  sectionTabSelected: { backgroundColor: setupTheme.color.surface },
  sectionTabText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    textAlign: "center",
    fontWeight: "500",
  },
  sectionTabTextSelected: {
    color: setupTheme.color.primary,
    fontWeight: "600",
  },
});
