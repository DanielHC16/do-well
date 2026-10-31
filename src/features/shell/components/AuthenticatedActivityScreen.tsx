import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/shared/ui/Typography";

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
import { setupTheme } from "@/features/setup/setupTheme";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/shared/ui";
import { AppIcon } from "@/shared/ui/AppIcon";
import { useShellMode } from "@/features/shell/context/useShellMode";

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

export function AuthenticatedActivityScreen({
  userId,
  gateway = assignmentGateway,
  notifications = notificationService,
  dedupeStore = notificationDedupeStore,
}: AuthenticatedActivityScreenProps) {
  const router = useRouter();
  const { mode } = useShellMode();
  const [events, setEvents] = useState<ActivityEventRecord[]>([]);
  const [settledRequest, setSettledRequest] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const requestKey = `${userId}:${reload}`;
  const busy = settledRequest !== requestKey;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertsBusy, setAlertsBusy] = useState(false);

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
        setErrorMessage(null);
      })
      .catch(() => {
        if (!mounted) return;
        setErrorMessage("We couldn't load your activity. Try again.");
      })
      .finally(() => {
        if (!mounted) return;
        setSettledRequest(requestKey);
      });

    return () => {
      mounted = false;
    };
  }, [gateway, requestKey]);

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

  async function handlePressEvent(event: ActivityEventRecord) {
    if (event.readAt === null) {
      try {
        const updated = await gateway.markActivityRead(event.id);
        setEvents((prev) => prev.map((e) => (e.id === event.id ? updated : e)));
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

  return (
    <MarketplaceShell
      activeSection="activity"
      compactHeader
      subtitle="Applications, work updates, and decisions in one place."
      title="Activity"
    >
      <View style={styles.listHeader}>
        <Text accessibilityRole="header" style={styles.listTitle}>
          Recent activity
        </Text>
        <Pressable
          accessibilityLabel="Refresh activity"
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: busy }}
          disabled={busy}
          onPress={() => setReload((value) => value + 1)}
          style={styles.refreshButton}
        >
          {busy ? (
            <ActivityIndicator color={setupTheme.color.primary} />
          ) : (
            <AppIcon name="refresh" size={20} />
          )}
        </Pressable>
      </View>
      {busy ? (
        <LoadingSkeleton label="Loading activity…" />
      ) : errorMessage ? (
        <ErrorState
          message={errorMessage}
          onRetry={() => setReload((value) => value + 1)}
        />
      ) : events.length === 0 ? (
        <EmptyState
          kind="activity"
          title="No activity yet"
          message="Your application and work updates appear here."
        />
      ) : (
        <View style={styles.eventList}>
          {events.map((event) => {
            const isUnread = event.readAt === null;
            return (
              <Pressable
                accessibilityLabel={`${isUnread ? "Unread. " : ""}${formatEventTitle(event)}. ${formatEventDescription(event)}`}
                accessibilityRole="button"
                accessibilityHint={
                  event.assignmentId ? "Opens the task agreement." : undefined
                }
                key={event.id}
                onPress={() => void handlePressEvent(event)}
                style={[styles.eventCard, isUnread && styles.unreadEventCard]}
              >
                <View style={styles.eventIcon}>
                  <AppIcon
                    name={event.assignmentId ? "briefcase" : "bell"}
                    size={20}
                    color={setupTheme.color.primary}
                  />
                </View>
                <View style={styles.eventContent}>
                  <View style={styles.eventTopRow}>
                    <View style={styles.eventBadgeGroup}>
                      {isUnread ? (
                        <View style={styles.newPill}>
                          <Text style={styles.newPillText}>New</Text>
                        </View>
                      ) : null}
                      <Text style={styles.eventTitle}>
                        {formatEventTitle(event)}
                      </Text>
                    </View>
                    <Text style={styles.eventTime}>
                      {new Date(event.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                  <Text style={styles.eventDescription}>
                    {formatEventDescription(event)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      {!alertsEnabled ? (
        <View style={styles.alertBanner}>
          <AppIcon name="bell" size={20} />
          <View style={styles.alertCopy}>
            <Text style={styles.alertTitle}>Device alerts</Text>
            <Text style={styles.alertDescription}>
              Optional work notifications.
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Enable local activity alerts"
            accessibilityRole="button"
            accessibilityState={{ busy: alertsBusy, disabled: alertsBusy }}
            disabled={alertsBusy}
            onPress={() => void handleEnableAlerts()}
            style={styles.alertAction}
          >
            {alertsBusy ? (
              <ActivityIndicator color={setupTheme.color.primary} />
            ) : null}
            <Text style={styles.alertActionText}>Enable</Text>
          </Pressable>
        </View>
      ) : null}
    </MarketplaceShell>
  );
}

const styles = StyleSheet.create({
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: setupTheme.spacing.compact,
  },
  listTitle: {
    flex: 1,
    fontSize: setupTheme.type.cardTitle,
    fontWeight: "600",
    color: setupTheme.color.foreground,
  },
  refreshButton: {
    minHeight: setupTheme.size.touchTarget,
    minWidth: setupTheme.size.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: setupTheme.radius.control,
    backgroundColor: setupTheme.color.accentSurface,
  },
  alertBanner: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.compact + setupTheme.spacing.tight,
    borderRadius: setupTheme.radius.card,
    backgroundColor: setupTheme.color.accentSurface,
  },
  alertCopy: { flex: 1, minWidth: 120, gap: setupTheme.spacing.tight },
  alertTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "600",
  },
  alertDescription: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    lineHeight: 18,
  },
  alertAction: {
    minHeight: setupTheme.size.touchTarget,
    minWidth: setupTheme.size.touchTarget,
    flexDirection: "row",
    gap: setupTheme.spacing.tight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: setupTheme.spacing.compact,
  },
  alertActionText: {
    color: setupTheme.color.primary,
    fontWeight: "600",
    fontSize: setupTheme.type.body,
  },
  eventIcon: {
    minHeight: 36,
    width: 36,
    borderRadius: setupTheme.radius.control,
    backgroundColor: setupTheme.color.accentSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  eventContent: { flex: 1, gap: setupTheme.spacing.compact },
  eventList: {
    gap: setupTheme.spacing.compact,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.card,
    borderWidth: 1,
    gap: setupTheme.spacing.compact + setupTheme.spacing.tight,
    padding: setupTheme.spacing.compact + setupTheme.spacing.tight,
  },
  unreadEventCard: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderLeftWidth: 3,
    borderLeftColor: setupTheme.color.primary,
    borderWidth: 1,
  },
  eventTopRow: {
    flexWrap: "wrap",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  eventBadgeGroup: {
    flex: 1,
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  newPill: {
    backgroundColor: setupTheme.color.accentSurface,
    borderRadius: setupTheme.radius.status,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newPillText: {
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.caption,
    fontWeight: "600",
  },
  eventTitle: {
    flexShrink: 1,
    lineHeight: 22,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.cardTitle,
    fontWeight: "600",
  },
  eventTime: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "600",
  },
  eventDescription: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: 20,
  },
});
