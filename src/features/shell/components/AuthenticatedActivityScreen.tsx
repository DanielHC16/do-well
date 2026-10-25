import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
import { useShellMode } from "@/features/shell/context/useShellMode";

import { MarketplaceShell, marketplaceStyles } from "./MarketplaceShell";

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
  const [busy, setBusy] = useState(true);
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
      .catch((err: unknown) => {
        if (!mounted) return;
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Unable to load activity events.",
        );
      })
      .finally(() => {
        if (!mounted) return;
        setBusy(false);
      });

    return () => {
      mounted = false;
    };
  }, [gateway]);

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
      subtitle="Applications, assignments, submissions, and approvals share one readable trail."
      title="Nothing gets lost in the handoff."
    >
      {!alertsEnabled ? (
        <View style={marketplaceStyles.card}>
          <Text style={marketplaceStyles.cardKicker}>LOCAL ALERTS</Text>
          <Text style={marketplaceStyles.cardTitle}>Keep handoffs visible</Text>
          <Text style={marketplaceStyles.body}>
            Enable on-device alerts for new assignment activity already synced
            to this account. No paid push service is used.
          </Text>
          <Pressable
            accessibilityLabel="Enable local activity alerts"
            accessibilityRole="button"
            disabled={alertsBusy}
            onPress={() => void handleEnableAlerts()}
            style={marketplaceStyles.primaryButton}
          >
            <Text style={marketplaceStyles.primaryButtonText}>
              {alertsBusy ? "Requesting permission..." : "Enable local alerts"}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {busy ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={setupTheme.color.foreground} />
          <Text style={styles.loadingText}>Loading activity trail...</Text>
        </View>
      ) : errorMessage ? (
        <View style={marketplaceStyles.card}>
          <Text style={styles.errorKicker}>ACTIVITY ERROR</Text>
          <Text style={marketplaceStyles.body}>{errorMessage}</Text>
        </View>
      ) : events.length === 0 ? (
        <View style={marketplaceStyles.card}>
          <Text style={marketplaceStyles.cardKicker}>RECENT ACTIVITY</Text>
          <Text style={marketplaceStyles.cardTitle}>No activity yet</Text>
          <Text style={marketplaceStyles.body}>
            Real account activity will appear here as you apply to gigs, select
            workers, confirm agreements, and update milestones.
          </Text>
        </View>
      ) : (
        <View style={styles.eventList}>
          {events.map((event) => {
            const isUnread = event.readAt === null;
            return (
              <Pressable
                accessibilityLabel={`${formatEventTitle(event)}. ${formatEventDescription(event)}`}
                accessibilityRole="button"
                key={event.id}
                onPress={() => void handlePressEvent(event)}
                style={[styles.eventCard, isUnread && styles.unreadEventCard]}
              >
                <View style={styles.eventTopRow}>
                  <View style={styles.eventBadgeGroup}>
                    {isUnread ? (
                      <View style={styles.newPill}>
                        <Text style={styles.newPillText}>NEW</Text>
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
                {event.assignmentId ? (
                  <Text style={styles.viewLinkText}>
                    View Task Agreement &rarr;
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </MarketplaceShell>
  );
}

const styles = StyleSheet.create({
  loadingBox: {
    alignItems: "center",
    gap: setupTheme.spacing.compact,
    paddingVertical: setupTheme.spacing.section * 2,
  },
  loadingText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
  },
  errorKicker: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
  },
  eventList: {
    gap: setupTheme.spacing.compact,
  },
  eventCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1.5,
    gap: 6,
    padding: setupTheme.spacing.compact,
  },
  unreadEventCard: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    borderWidth: 2,
  },
  eventTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  eventBadgeGroup: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  newPill: {
    backgroundColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.status,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newPillText: {
    color: setupTheme.color.surface,
    fontSize: 9,
    fontWeight: "900",
  },
  eventTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  eventTime: {
    color: setupTheme.color.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  eventDescription: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 20,
  },
  viewLinkText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "800",
    marginTop: 2,
  },
});
