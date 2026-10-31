import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import {
  EmptyState,
  ErrorState,
  IconButton,
  PressableScale,
  Skeleton,
  Txt,
} from "@/components/ui";

import {
  assignmentGateway,
  type AssignmentGateway,
} from "@/features/assignments/data/assignment-gateway";
import type { ActivityEventRecord } from "@/features/assignments/model/assignment-schemas";
import {
  notificationDedupeStore,
  type NotificationDedupeStore,
  type NotificationPayload,
  notificationService,
  type NotificationService,
} from "@/features/notifications";
import { useConnectivity } from "@/features/connectivity/context/ConnectivityProvider";
import { useShellMode } from "@/features/shell/context/useShellMode";
import { invalidateUnreadActivity } from "@/features/shell/context/useUnreadActivity";
import { classifyLoadError, type LoadErrorKind } from "@/shared/api/load-error";
import {
  formatShortDate,
  formatTime,
  formatUpdatedAt,
} from "@/shared/format/format";
import { AppIcon, type AppIconName } from "@/shared/ui/AppIcon";
import { palette, radius, size, space, status, type StatusTone } from "@/theme";

import { MarketplaceShell } from "./MarketplaceShell";

type AuthenticatedActivityScreenProps = Readonly<{
  userId: string;
  gateway?: AssignmentGateway;
  notifications?: Pick<
    NotificationService,
    | "checkPermissions"
    | "requestPermissions"
    | "configureChannels"
    | "scheduleNotification"
  >;
  dedupeStore?: NotificationDedupeStore;
}>;

const workerRecipientEvents = new Set([
  "gig_applicant_selected",
  "assignment_cancelled",
  "milestone_created",
  "revision_requested",
  "assignment_completed",
]);

export function createActivityNotification(
  event: ActivityEventRecord,
): NotificationPayload | null {
  if (!event.assignmentId || event.readAt !== null) return null;
  const recipientRole = workerRecipientEvents.has(event.eventType)
    ? "worker"
    : "employer";
  const isMilestoneAlert = [
    "milestone_created",
    "milestone_started",
    "work_submitted",
    "revision_requested",
    "assignment_completed",
  ].includes(event.eventType);

  return {
    id: `activity_${event.id}`,
    title: formatEventTitle(event),
    body: formatEventDescription(event),
    channelId: isMilestoneAlert ? "milestone_alerts" : "assignment_updates",
    data: {
      route: `/(protected)/${recipientRole}/assignments/${event.assignmentId}`,
      assignmentId: event.assignmentId,
      eventType: event.eventType,
    },
  };
}

function formatEventTitle(event: ActivityEventRecord): string {
  switch (event.eventType) {
    case "gig_application_received":
      return "New Application Received";
    case "gig_application_withdrawn":
      return "Application Withdrawn";
    case "gig_applicant_selected":
      return "Selected for Task";
    case "assignment_confirmed":
      return "Agreement Confirmed";
    case "assignment_declined":
      return "Agreement Declined";
    case "assignment_cancelled":
      return "Agreement Cancelled";
    case "milestone_created":
      return "Milestone Step Added";
    case "milestone_started":
      return "Milestone Started";
    case "work_submitted":
      return "Work Submitted for Review";
    case "revision_requested":
      return "Revision Requested";
    case "assignment_completed":
      return "Contract Completed & Approved";
    default:
      return event.eventType.replace(/_/g, " ").toUpperCase();
  }
}

function formatEventDescription(event: ActivityEventRecord): string {
  const payload = event.payload as Record<string, unknown>;
  const title = typeof payload.title === "string" ? payload.title : null;

  switch (event.eventType) {
    case "gig_application_received":
      return title
        ? `A worker applied to your notice: "${title}".`
        : "A worker submitted an application to your gig notice.";
    case "gig_application_withdrawn":
      return "An applicant withdrew their submitted application.";
    case "gig_applicant_selected":
      return title
        ? `You were selected as the worker for "${title}". Review and confirm the agreement.`
        : "An employer selected you for a gig. Review the proposed agreement terms.";
    case "assignment_confirmed":
      return title
        ? `The agreement for "${title}" is confirmed. Work is now in progress.`
        : "Task agreement confirmed by the assigned worker.";
    case "assignment_declined":
      return title
        ? `The worker declined the agreement for "${title}". The gig has been reopened.`
        : "The proposed agreement was declined and the gig notice reopened.";
    case "assignment_cancelled":
      return title
        ? `The proposal for "${title}" was cancelled by the employer.`
        : "The agreement proposal was cancelled.";
    case "milestone_created":
      return title
        ? `New milestone added: "${title}".`
        : "A new milestone was added to your active assignment.";
    case "milestone_started":
      return title
        ? `Worker began work on: "${title}".`
        : "The worker started work on a milestone.";
    case "work_submitted":
      return title
        ? `Worker submitted completed work for "${title}".`
        : "Completed work was submitted for employer review.";
    case "revision_requested":
      return title
        ? `Revision requested for "${title}".`
        : "The employer requested adjustments on the work submission.";
    case "assignment_completed":
      return title
        ? `Completion approved for "${title}". Agreement finalized.`
        : "Work completion approved and contract finalized.";
    default:
      return title ?? "Activity event recorded on your account.";
  }
}

type EventStyle = Readonly<{ icon: AppIconName; tone: StatusTone }>;

const EVENT_STYLES: Readonly<Record<string, EventStyle>> = {
  gig_application_received: { icon: "file", tone: "info" },
  gig_application_withdrawn: { icon: "close", tone: "neutral" },
  gig_applicant_selected: { icon: "check", tone: "success" },
  assignment_confirmed: { icon: "check", tone: "success" },
  assignment_declined: { icon: "close", tone: "danger" },
  assignment_cancelled: { icon: "close", tone: "danger" },
  milestone_created: { icon: "flag", tone: "info" },
  milestone_started: { icon: "clock", tone: "info" },
  work_submitted: { icon: "file", tone: "warning" },
  revision_requested: { icon: "edit", tone: "danger" },
  assignment_completed: { icon: "check", tone: "success" },
};

function eventStyle(eventType: string): EventStyle {
  return EVENT_STYLES[eventType] ?? { icon: "bell", tone: "info" };
}

function isToday(iso: string, now: Date = new Date()): boolean {
  const date = new Date(iso);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/** Splits newest-first events into Today / Earlier groups (empty groups omitted). */
export function groupActivity(
  events: readonly ActivityEventRecord[],
  now: Date = new Date(),
): { title: string; events: ActivityEventRecord[] }[] {
  const today = events.filter((event) => isToday(event.createdAt, now));
  const earlier = events.filter((event) => !isToday(event.createdAt, now));
  return [
    { title: "Today", events: today },
    { title: "Earlier", events: earlier },
  ].filter((group) => group.events.length > 0);
}

// Session-scoped so the banner stays dismissed across tab switches.
const dismissedAlertBanners = new Set<string>();

function ActivityRow({
  event,
  showDivider,
  onPress,
}: Readonly<{
  event: ActivityEventRecord;
  showDivider: boolean;
  onPress: (event: ActivityEventRecord) => void;
}>) {
  const unread = event.readAt === null;
  const { icon, tone } = eventStyle(event.eventType);
  const colors = status[tone];
  const time = isToday(event.createdAt)
    ? formatTime(event.createdAt)
    : formatShortDate(event.createdAt);
  return (
    <PressableScale
      accessibilityLabel={`${unread ? "Unread. " : ""}${formatEventTitle(event)}. ${formatEventDescription(event)}`}
      accessibilityRole="button"
      accessibilityHint={
        event.assignmentId ? "Opens the task agreement." : undefined
      }
      onPress={() => onPress(event)}
      style={[styles.row, showDivider && styles.divider]}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.bg }]}>
        <AppIcon name={icon} size={size.iconSmall} color={colors.fg} />
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowTop}>
          <Txt
            variant={unread ? "bodyStrong" : "body"}
            numberOfLines={1}
            style={styles.rowTitle}
          >
            {formatEventTitle(event)}
          </Txt>
          <Txt variant="micro" tone="secondary">
            {time}
          </Txt>
        </View>
        <Txt variant="caption" tone="secondary" numberOfLines={2}>
          {formatEventDescription(event)}
        </Txt>
      </View>
      {unread ? <View style={styles.unreadDot} /> : null}
    </PressableScale>
  );
}

export function AuthenticatedActivityScreen({
  userId,
  gateway = assignmentGateway,
  notifications = notificationService,
  dedupeStore = notificationDedupeStore,
}: AuthenticatedActivityScreenProps) {
  const router = useRouter();
  const { mode } = useShellMode();
  const { reportRequestOutcome } = useConnectivity();
  const [events, setEvents] = useState<ActivityEventRecord[]>([]);
  const [settledRequest, setSettledRequest] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const requestKey = `${userId}:${reload}`;
  const busy = settledRequest !== requestKey;
  const [errorKind, setErrorKind] = useState<LoadErrorKind | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertsBusy, setAlertsBusy] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    dismissedAlertBanners.has(userId),
  );

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const granted = await notifications.checkPermissions();
      if (!granted) return;
      await notifications.configureChannels();
      if (mounted) setAlertsEnabled(true);
    })().catch(() => {
      // Permission/channel checks are optional and must not block activity.
    });
    return () => {
      mounted = false;
    };
  }, [notifications]);

  useEffect(() => {
    let mounted = true;

    gateway
      .listUserActivity(50, 0)
      .then((data) => {
        if (!mounted) return;
        setEvents(data);
        setErrorKind(null);
        setUpdatedAt(new Date().toISOString());
        reportRequestOutcome("ok");
      })
      .catch((cause: unknown) => {
        if (!mounted) return;
        const kind = classifyLoadError(cause);
        reportRequestOutcome(kind);
        setErrorKind(kind);
      })
      .finally(() => {
        if (!mounted) return;
        setSettledRequest(requestKey);
        setPulling(false);
      });

    return () => {
      mounted = false;
    };
  }, [gateway, requestKey, reportRequestOutcome]);

  useEffect(() => {
    if (!alertsEnabled || busy) return;
    let active = true;

    void (async () => {
      const initialized = await dedupeStore.isInitialized(userId);
      if (!active) return;
      if (!initialized) {
        await dedupeStore.initialize(
          userId,
          events.map((event) => event.id),
        );
        return;
      }
      const seen = new Set(await dedupeStore.list(userId));
      for (const event of events) {
        if (!active || seen.has(event.id)) continue;
        const payload = createActivityNotification(event);
        if (!payload) continue;
        try {
          await notifications.scheduleNotification(payload);
          await dedupeStore.mark(userId, event.id);
          seen.add(event.id);
        } catch {
          // Keep the event unmarked so a later refresh can retry safely.
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [alertsEnabled, busy, dedupeStore, events, notifications, userId]);

  async function handleEnableAlerts() {
    setAlertsBusy(true);
    try {
      await notifications.configureChannels();
      setAlertsEnabled(await notifications.requestPermissions());
    } finally {
      setAlertsBusy(false);
    }
  }

  function dismissBanner() {
    dismissedAlertBanners.add(userId);
    setBannerDismissed(true);
  }

  async function handlePressEvent(event: ActivityEventRecord) {
    if (event.readAt === null) {
      try {
        const updated = await gateway.markActivityRead(event.id);
        setEvents((prev) => prev.map((e) => (e.id === event.id ? updated : e)));
        invalidateUnreadActivity(userId);
      } catch {
        // Optimistic / non-blocking
      }
    }

    if (event.assignmentId) {
      const targetRoute =
        mode === "employer"
          ? `/(protected)/employer/assignments/${event.assignmentId}`
          : `/(protected)/worker/assignments/${event.assignmentId}`;
      router.push(targetRoute as unknown as Parameters<typeof router.push>[0]);
    }
  }

  const groups = groupActivity(events);

  return (
    <MarketplaceShell
      activeSection="activity"
      title="Activity"
      refreshing={pulling}
      onRefresh={() => {
        setPulling(true);
        setReload((value) => value + 1);
      }}
    >
      {!alertsEnabled && !bannerDismissed ? (
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <AppIcon name="bell" size={size.iconSmall} color={palette.navy} />
          </View>
          <View style={styles.bannerCopy}>
            <Txt variant="caption" style={styles.bannerTitle}>
              Turn on device alerts
            </Txt>
            <Txt variant="micro" tone="secondary">
              Optional work updates.
            </Txt>
          </View>
          <PressableScale
            accessibilityLabel="Enable local activity alerts"
            accessibilityRole="button"
            accessibilityState={{ busy: alertsBusy, disabled: alertsBusy }}
            disabled={alertsBusy}
            onPress={() => void handleEnableAlerts()}
            style={styles.bannerAction}
          >
            {alertsBusy ? (
              <ActivityIndicator color={palette.purple} />
            ) : (
              <Txt variant="caption" style={styles.bannerActionText}>
                Enable
              </Txt>
            )}
          </PressableScale>
          <IconButton
            icon="close"
            variant="muted"
            accessibilityLabel="Dismiss device alerts suggestion"
            onPress={dismissBanner}
          />
        </View>
      ) : null}
      {updatedAt && !busy && !errorKind ? (
        <Txt variant="micro" tone="secondary" style={styles.updated}>
          {formatUpdatedAt(updatedAt)}
        </Txt>
      ) : null}
      {busy && !pulling ? (
        <Skeleton shape="row" count={4} label="Loading activity" />
      ) : errorKind ? (
        <ErrorState
          kind={errorKind}
          message="We couldn't load your activity. Try again."
          onRetry={() => setReload((value) => value + 1)}
        />
      ) : events.length === 0 ? (
        <EmptyState
          compact
          icon="bell"
          title="No activity yet"
          message="Applications, selections and reviews will appear here."
        />
      ) : (
        groups.map((group) => (
          <View key={group.title} style={styles.group}>
            <Txt variant="title" accessibilityRole="header">
              {group.title}
            </Txt>
            <View style={styles.card}>
              {group.events.map((event, index) => (
                <ActivityRow
                  key={event.id}
                  event={event}
                  showDivider={index > 0}
                  onPress={(pressed) => void handlePressEvent(pressed)}
                />
              ))}
            </View>
          </View>
        ))
      )}
    </MarketplaceShell>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.xs,
    paddingLeft: space.sm,
    paddingRight: space.xxs,
    borderRadius: radius.input,
    backgroundColor: palette.lavender,
  },
  bannerIcon: {
    width: size.iconButton - space.xs,
    height: size.iconButton - space.xs,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerCopy: { flex: 1, minWidth: 0 },
  bannerTitle: { color: palette.text, fontWeight: "600" },
  bannerAction: {
    minHeight: size.touchTarget,
    paddingHorizontal: space.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  bannerActionText: { color: palette.purple, fontWeight: "600" },
  updated: { alignSelf: "flex-end" },
  group: { gap: space.xs },
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: size.primaryButton + space.md,
  },
  divider: { borderTopWidth: 1, borderTopColor: palette.border },
  iconCircle: {
    width: size.avatar,
    height: size.avatar,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: { flex: 1, minWidth: 0, gap: 2 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  rowTitle: { flex: 1 },
  unreadDot: {
    width: size.dot + 4,
    height: size.dot + 4,
    borderRadius: radius.pill,
    backgroundColor: palette.mint,
    // Mint alone is ~1.5:1 on white; the ring keeps the indicator visible.
    borderWidth: 1.5,
    borderColor: status.success.fg,
  },
});
