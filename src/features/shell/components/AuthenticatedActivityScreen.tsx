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
import { setupTheme } from "@/features/setup/setupTheme";
import { useShellMode } from "@/features/shell/context/useShellMode";

import { MarketplaceShell, marketplaceStyles } from "./MarketplaceShell";

type AuthenticatedActivityScreenProps = Readonly<{
  gateway?: AssignmentGateway;
}>;

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
    default:
      return title ?? "Activity event recorded on your account.";
  }
}

export function AuthenticatedActivityScreen({
  gateway = assignmentGateway,
}: AuthenticatedActivityScreenProps) {
  const router = useRouter();
  const { mode } = useShellMode();
  const [events, setEvents] = useState<ActivityEventRecord[]>([]);
  const [busy, setBusy] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
