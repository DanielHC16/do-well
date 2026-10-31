import { useFocusEffect, useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";

import {
  BADGES,
  EmptyState,
  ErrorState,
  ProgressHeroCard,
  SecondaryButton,
  SegmentedPills,
  Skeleton,
  TaskCard,
  Txt,
  badgeFor,
  type Badge,
} from "@/components/ui";
import { useConnectivity } from "@/features/connectivity/context/ConnectivityProvider";
import { MarketplaceShell } from "@/features/shell/components/MarketplaceShell";
import type { ShellMode } from "@/features/shell/model/shell-mode";
import { classifyLoadError, type LoadErrorKind } from "@/shared/api/load-error";
import { formatTime, formatUpdatedAt, isDueSoon } from "@/shared/format/format";
import type { CacheStore } from "@/shared/persistence/cache-store";
import { palette, radius, size, space, status } from "@/theme";

import { createCachedWorkReader, lazyCacheStore } from "../data/work-cache";
import {
  WORK_PAGE_SIZE,
  workGateway,
  type WorkGateway,
  type WorkItem,
  type WorkSection,
} from "../data/work-gateway";
import {
  loadAssignmentInsight,
  milestoneProgress,
  useAssignmentInsight,
  weekMilestoneSummary,
  type InsightSource,
  type WeekSummary,
} from "../data/work-insights";

type Props = Readonly<{
  userId: string;
  mode: ShellMode;
  initialSection?: WorkSection;
  gateway?: Pick<WorkGateway, "list">;
  cache?: CacheStore;
  insights?: InsightSource;
}>;

const SEGMENTS: Record<
  ShellMode,
  readonly Readonly<{ value: WorkSection; label: string }>[]
> = {
  worker: [
    { value: "applications", label: "Applications" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
  ],
  employer: [
    { value: "listings", label: "Posted" },
    { value: "active", label: "In progress" },
    { value: "completed", label: "Completed" },
  ],
};

const EMPTY: Record<
  WorkSection,
  Readonly<{ title: string; message: string }>
> = {
  applications: {
    title: "No applications yet",
    message: "Apply to a gig and track it here.",
  },
  listings: {
    title: "No posted gigs yet",
    message: "Post a gig and follow applicants here.",
  },
  active: {
    title: "No active work yet",
    message: "Selected gigs and their milestones show up here.",
  },
  completed: {
    title: "No completed work yet",
    message: "Approved work appears here.",
  },
};

function itemBadges(item: WorkItem): Badge[] {
  const domain =
    item.kind === "application"
      ? "application"
      : item.kind === "listing"
        ? "gig"
        : "assignment";
  const badges: Badge[] = [badgeFor(domain, item.status)];
  const finished = ["completed", "closed", "cancelled", "withdrawn"].includes(
    item.status,
  );
  if (!finished && item.dueAt) {
    if (new Date(item.dueAt).getTime() < Date.now())
      badges.push(BADGES.overdue);
    else if (isDueSoon(item.dueAt)) badges.push(BADGES.dueSoon);
  }
  return badges;
}

const WorkCard = memo(function WorkCard({
  item,
  mode,
  userId,
  refreshKey,
  insights,
  onOpen,
}: Readonly<{
  item: WorkItem;
  mode: ShellMode;
  userId: string;
  refreshKey: number;
  insights?: InsightSource;
  onOpen: (item: WorkItem) => void;
}>) {
  const insight = useAssignmentInsight(
    item.kind === "assignment" ? item.id : null,
    mode,
    userId,
    refreshKey,
    insights,
  );
  const progress = insight
    ? milestoneProgress(insight.milestones, item.status)
    : item.status === "completed"
      ? milestoneProgress([], "completed")
      : null;
  return (
    <TaskCard
      title={item.title}
      badges={itemBadges(item)}
      amount={item.amount}
      dueAt={item.dueAt}
      progress={progress?.value ?? null}
      progressLabel={progress?.label}
      people={insight?.counterpart ? [insight.counterpart] : []}
      onPress={() => onOpen(item)}
    />
  );
});

/** This week's milestones across the employer's active assignments. */
function useWeekSummary(
  enabled: boolean,
  userId: string,
  refreshKey: number,
  read: (offset: number) => Promise<WorkItem[]>,
  insights?: InsightSource,
): WeekSummary | null {
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void read(0)
      .then((assignments) =>
        Promise.all(
          assignments.map((assignment) =>
            loadAssignmentInsight(assignment.id, "employer", userId, insights),
          ),
        ),
      )
      .then((all) => {
        if (active)
          setSummary(
            weekMilestoneSummary(all.flatMap((insight) => insight.milestones)),
          );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [enabled, userId, refreshKey, read, insights]);
  return summary;
}

export function MyWorkScreen({
  userId,
  mode,
  initialSection,
  gateway = workGateway,
  cache = lazyCacheStore,
  insights,
}: Props) {
  const router = useRouter();
  const { reportRequestOutcome } = useConnectivity();
  const segments = SEGMENTS[mode];
  const [section, setSection] = useState<WorkSection>(
    segments.some((segment) => segment.value === initialSection)
      ? (initialSection as WorkSection)
      : segments[0].value,
  );
  const reader = useMemo(
    () => createCachedWorkReader(gateway, cache),
    [gateway, cache],
  );
  const [items, setItems] = useState<WorkItem[]>([]);
  const [nextOffset, setNextOffset] = useState(0);
  const generation = useRef(0);
  const [busy, setBusy] = useState(true);
  const [errorKind, setErrorKind] = useState<LoadErrorKind | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const load = useCallback(
    (offset: number) => {
      const request = ++generation.current;
      setBusy(true);
      setErrorKind(null);
      if (offset === 0) setItems([]);
      void reader(userId, mode, section, offset)
        .then((page) => {
          if (request !== generation.current) return;
          setItems((previous) =>
            offset === 0
              ? page.items
              : [
                  ...previous,
                  ...page.items.filter(
                    (row) => !previous.some((item) => item.id === row.id),
                  ),
                ],
          );
          setNextOffset(offset + WORK_PAGE_SIZE);
          setHasMore(!page.cachedAt && page.items.length === WORK_PAGE_SIZE);
          setSavedAt(page.cachedAt);
          if (page.cachedAt) reportRequestOutcome("offline");
          else {
            setUpdatedAt(new Date().toISOString());
            reportRequestOutcome("ok");
          }
        })
        .catch((cause: unknown) => {
          if (request !== generation.current) return;
          const kind = classifyLoadError(cause);
          reportRequestOutcome(kind);
          setErrorKind(kind);
        })
        .finally(() => {
          if (request !== generation.current) return;
          setBusy(false);
          setPulling(false);
        });
    },
    [mode, reader, reportRequestOutcome, section, userId],
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

  const readActive = useCallback(
    (offset: number) =>
      reader(userId, "employer", "active", offset).then((page) => page.items),
    [reader, userId],
  );
  const week = useWeekSummary(
    mode === "employer",
    userId,
    refreshKey,
    readActive,
    insights,
  );

  function chooseSection(next: WorkSection) {
    if (next === section) return;
    setItems([]);
    setBusy(true);
    setErrorKind(null);
    setSection(next);
  }

  function refresh() {
    setPulling(true);
    setRefreshKey((value) => value + 1);
    load(0);
  }

  const open = useCallback(
    (item: WorkItem) => {
      if (item.kind === "assignment")
        router.push(`/(protected)/${mode}/assignments/${item.id}`);
      else router.push(`/(protected)/${mode}/gigs/${item.gigId}`);
    },
    [mode, router],
  );

  const weekCard =
    mode === "employer" ? (
      <ProgressHeroCard
        title="This week"
        subtitle={
          week === null
            ? "Checking milestones…"
            : week.total === 0
              ? "No milestones due this week"
              : `${week.approved} of ${week.total} milestones approved`
        }
        progress={week && week.total ? week.approved / week.total : 0}
        progressLabel={
          week && week.total
            ? `${week.approved} of ${week.total} milestones due this week approved`
            : "No milestones due this week"
        }
        stats={[
          { value: week ? String(week.total) : "–", label: "Due this week" },
          { value: week ? String(week.toReview) : "–", label: "To review" },
          { value: week ? String(week.approved) : "–", label: "Approved" },
        ]}
      />
    ) : null;

  const freshness = savedAt ? (
    <View
      accessible
      accessibilityLabel={`Showing work saved at ${formatTime(savedAt) ?? "an earlier time"}. You may be offline.`}
      style={styles.stale}
    >
      <View style={styles.staleDot} />
      <Txt variant="micro" style={{ color: status.warning.fg }}>
        Saved {formatTime(savedAt) ?? "earlier"} · offline
      </Txt>
    </View>
  ) : updatedAt && !busy ? (
    <Txt variant="micro" tone="secondary">
      {formatUpdatedAt(updatedAt)}
    </Txt>
  ) : null;

  return (
    <MarketplaceShell
      activeSection="work"
      title="My work"
      scrollable={false}
      listContent={(notices) => (
        <FlatList
          testID="work-list"
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={pulling}
              onRefresh={refresh}
              colors={[palette.purple]}
              progressBackgroundColor={palette.surface}
            />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              {notices}
              {weekCard}
              <SegmentedPills
                accessibilityLabel="Work sections"
                value={section}
                onChange={chooseSection}
                segments={segments}
              />
              {freshness ? (
                <View style={styles.captionRow}>{freshness}</View>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <WorkCard
              item={item}
              mode={mode}
              userId={userId}
              refreshKey={refreshKey}
              insights={insights}
              onOpen={open}
            />
          )}
          ListEmptyComponent={
            busy ? (
              <Skeleton label="Loading your work" count={3} />
            ) : errorKind ? (
              <ErrorState
                kind={errorKind}
                message="We couldn't load your work. Try again."
                onRetry={() => load(0)}
              />
            ) : (
              <EmptyState
                compact
                icon={section === "completed" ? "check" : "briefcase"}
                title={EMPTY[section].title}
                message={EMPTY[section].message}
                actionLabel={mode === "worker" ? "Discover gigs" : "Post a gig"}
                onAction={() =>
                  router.push(
                    mode === "worker"
                      ? "/(protected)/worker"
                      : "/(protected)/employer/gigs/new",
                  )
                }
              />
            )
          }
          ListFooterComponent={
            items.length > 0 ? (
              <View style={styles.header}>
                {busy ? <Skeleton label="Loading more work" count={1} /> : null}
                {errorKind ? (
                  <ErrorState
                    kind={errorKind}
                    message="We couldn't load more work. Your list is still here."
                    onRetry={() => load(nextOffset)}
                  />
                ) : null}
                {!busy && !errorKind && hasMore ? (
                  <SecondaryButton
                    label="Load more work"
                    onPress={() => load(nextOffset)}
                  />
                ) : null}
              </View>
            ) : undefined
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    width: "100%",
    maxWidth: size.contentMax,
    paddingHorizontal: size.screenPadding,
    paddingTop: space.lg,
    paddingBottom: space.xxl,
    gap: space.sm,
  },
  header: { gap: space.md, marginBottom: space.xxs },
  captionRow: { flexDirection: "row", justifyContent: "flex-end" },
  stale: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xxs,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: status.warning.border,
    backgroundColor: status.warning.bg,
  },
  staleDot: {
    width: size.dot,
    height: size.dot,
    borderRadius: radius.pill,
    backgroundColor: status.warning.base,
  },
});
