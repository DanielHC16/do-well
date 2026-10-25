import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setupTheme } from "@/features/setup/setupTheme";

import {
  assignmentGateway,
  type AssignmentGateway,
} from "../data/assignment-gateway";
import type {
  AssignmentDetail,
  MilestoneRecord,
} from "../model/assignment-schemas";

type WorkerAssignmentDetailScreenProps = Readonly<{
  assignmentId: string;
  gateway?: AssignmentGateway;
}>;

export function WorkerAssignmentDetailScreen({
  assignmentId,
  gateway = assignmentGateway,
}: WorkerAssignmentDetailScreenProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<AssignmentDetail | null>(null);
  const [milestones, setMilestones] = useState<MilestoneRecord[]>([]);
  const [busy, setBusy] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      gateway.getAssignmentDetail(assignmentId),
      gateway.listMilestones(assignmentId).catch(() => []),
    ])
      .then(([detailData, milestonesData]) => {
        if (!mounted) return;
        setDetail(detailData);
        setMilestones(milestonesData);
        setErrorMessage(null);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Unable to load assignment details.",
        );
      })
      .finally(() => {
        if (!mounted) return;
        setBusy(false);
      });

    return () => {
      mounted = false;
    };
  }, [assignmentId, gateway]);

  async function handleConfirm() {
    setActionBusy(true);
    setErrorMessage(null);
    setActionSuccess(null);
    try {
      const updated = await gateway.confirmAssignment(assignmentId);
      setDetail((prev) => (prev ? { ...prev, assignment: updated } : prev));
      setActionSuccess("Agreement confirmed! You can now start working.");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to confirm agreement.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDecline() {
    setActionBusy(true);
    setErrorMessage(null);
    setActionSuccess(null);
    try {
      const updated = await gateway.declineAssignment(assignmentId);
      setDetail((prev) => (prev ? { ...prev, assignment: updated } : prev));
      setActionSuccess("Agreement proposal declined.");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to decline agreement.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleStartMilestone(milestoneId: string) {
    setActionBusy(true);
    setErrorMessage(null);
    setActionSuccess(null);
    try {
      const updatedMilestone = await gateway.startMilestone(milestoneId);
      setMilestones((prev) =>
        prev.map((m) => (m.id === milestoneId ? updatedMilestone : m)),
      );
      setActionSuccess(`Started milestone: ${updatedMilestone.title}`);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to start milestone.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  if (busy) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator color={setupTheme.color.foreground} />
        <Text style={styles.loadingText}>Loading agreement details...</Text>
      </SafeAreaView>
    );
  }

  if (errorMessage && !detail) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>AGREEMENT UNAVAILABLE</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/(protected)/worker")}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Return to workspace</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!detail) {
    return null;
  }

  const { assignment, employer, gig } = detail;
  const isProposed = assignment.status === "proposed";
  const isActive = assignment.status === "active";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top bar */}
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to workspace"
            onPress={() => router.back()}
            style={styles.backIconButton}
          >
            <Text style={styles.backIconText}>&larr; Back</Text>
          </Pressable>
          <Text
            style={[
              styles.statusBadge,
              assignment.status === "active" && styles.statusActive,
              assignment.status === "proposed" && styles.statusProposed,
              assignment.status === "completed" && styles.statusCompleted,
              (assignment.status === "declined" ||
                assignment.status === "cancelled") &&
                styles.statusTerminated,
            ]}
          >
            {assignment.status.toUpperCase()}
          </Text>
        </View>

        {/* Feedback alerts */}
        {actionSuccess ? (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>{actionSuccess}</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Title and Employer card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroKicker}>TASK AGREEMENT</Text>
          <Text style={styles.heroTitle}>{assignment.agreedTitle}</Text>
          <View style={styles.participantRow}>
            <View>
              <Text style={styles.participantLabel}>EMPLOYER</Text>
              <Text style={styles.participantName}>{employer.displayName}</Text>
              {employer.homeArea ? (
                <Text style={styles.participantArea}>{employer.homeArea}</Text>
              ) : null}
            </View>
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>AGREED PAYMENT</Text>
              <Text style={styles.amountValue}>
                ₱{assignment.agreedAmount.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Action card for proposed state */}
        {isProposed ? (
          <View style={styles.actionCard}>
            <Text style={styles.actionCardTitle}>REVIEW AND CONFIRM</Text>
            <Text style={styles.actionCardText}>
              The employer has selected you for this gig. Please review the
              terms and scope of work below. Confirming locks the agreement and
              begins the assignment.
            </Text>
            <View style={styles.decisionRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm agreement"
                disabled={actionBusy}
                onPress={handleConfirm}
                style={[
                  styles.confirmButton,
                  actionBusy && styles.disabledAction,
                ]}
              >
                {actionBusy ? (
                  <ActivityIndicator color={setupTheme.color.surface} />
                ) : (
                  <Text style={styles.confirmButtonText}>Accept Agreement</Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decline agreement"
                disabled={actionBusy}
                onPress={handleDecline}
                style={[
                  styles.declineButton,
                  actionBusy && styles.disabledAction,
                ]}
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Scope and Terms */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>SCOPE OF WORK</Text>
          <Text style={styles.bodyText}>{assignment.agreedDescription}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>WORK MODE</Text>
              <Text style={styles.metaValue}>{gig.workMode.toUpperCase()}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>CATEGORY</Text>
              <Text style={styles.metaValue}>{gig.category.toUpperCase()}</Text>
            </View>
            {gig.publicArea ? (
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>AREA</Text>
                <Text style={styles.metaValue}>{gig.publicArea}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Milestones list */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            MILESTONES ({milestones.length})
          </Text>
          {milestones.length === 0 ? (
            <Text style={styles.emptyText}>
              No structured milestones have been defined yet. Work directly
              under the agreed scope.
            </Text>
          ) : (
            <View style={styles.milestoneList}>
              {milestones.map((milestone) => (
                <View key={milestone.id} style={styles.milestoneItem}>
                  <View style={styles.milestoneTopRow}>
                    <Text style={styles.milestonePosition}>
                      STEP {milestone.position}
                    </Text>
                    <Text
                      style={[
                        styles.milestoneStatus,
                        milestone.status === "in_progress" &&
                          styles.milestoneInProgress,
                        milestone.status === "approved" &&
                          styles.milestoneApproved,
                      ]}
                    >
                      {milestone.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                  {milestone.description ? (
                    <Text style={styles.milestoneDescription}>
                      {milestone.description}
                    </Text>
                  ) : null}
                  {isActive && milestone.status === "pending" ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Start milestone ${milestone.title}`}
                      disabled={actionBusy}
                      onPress={() => void handleStartMilestone(milestone.id)}
                      style={[
                        styles.startMilestoneButton,
                        actionBusy && styles.disabledAction,
                      ]}
                    >
                      <Text style={styles.startMilestoneText}>
                        Start Milestone
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: setupTheme.color.background,
    flex: 1,
  },
  container: {
    gap: setupTheme.spacing.section,
    padding: setupTheme.spacing.section,
  },
  centerContainer: {
    alignItems: "center",
    backgroundColor: setupTheme.color.background,
    flex: 1,
    justifyContent: "center",
    padding: setupTheme.spacing.section,
  },
  loadingText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    marginTop: setupTheme.spacing.compact,
  },
  errorCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
    width: "100%",
  },
  errorTitle: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
  },
  errorText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    marginTop: setupTheme.spacing.compact,
    paddingVertical: setupTheme.spacing.compact,
  },
  backButtonText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.caption,
    fontWeight: "800",
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backIconButton: {
    paddingVertical: 4,
  },
  backIconText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
  statusBadge: {
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusProposed: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    color: setupTheme.color.foreground,
  },
  statusActive: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    color: setupTheme.color.ready,
  },
  statusCompleted: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    color: setupTheme.color.ready,
  },
  statusTerminated: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
    color: setupTheme.color.muted,
  },
  successBanner: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    padding: setupTheme.spacing.compact,
  },
  successBannerText: {
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
  },
  errorBanner: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    padding: setupTheme.spacing.compact,
  },
  errorBannerText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
  },
  heroCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  heroKicker: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
  },
  heroTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.title,
    fontWeight: "900",
    lineHeight: 28,
  },
  participantRow: {
    borderTopColor: setupTheme.color.borderSoft,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: setupTheme.spacing.compact,
  },
  participantLabel: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "800",
  },
  participantName: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
  participantArea: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
  },
  amountBox: {
    alignItems: "flex-end",
  },
  amountLabel: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "800",
  },
  amountValue: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  actionCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  actionCardTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
  },
  actionCardText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
  },
  decisionRow: {
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    marginTop: 8,
  },
  confirmButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    flex: 2,
    justifyContent: "center",
    minHeight: 48,
    paddingVertical: setupTheme.spacing.compact,
  },
  confirmButtonText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
  declineButton: {
    alignItems: "center",
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingVertical: setupTheme.spacing.compact,
  },
  declineButtonText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
  sectionCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  sectionTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
  },
  bodyText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 24,
  },
  metaRow: {
    borderTopColor: setupTheme.color.borderSoft,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: setupTheme.spacing.section,
    marginTop: 8,
    paddingTop: setupTheme.spacing.compact,
  },
  metaCol: {
    gap: 2,
  },
  metaLabel: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "800",
  },
  metaValue: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
  },
  emptyText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
  },
  milestoneList: {
    gap: setupTheme.spacing.compact,
  },
  milestoneItem: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    gap: 4,
    padding: setupTheme.spacing.compact,
  },
  milestoneTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  milestonePosition: {
    color: setupTheme.color.muted,
    fontSize: 10,
    fontWeight: "900",
  },
  milestoneStatus: {
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    color: setupTheme.color.muted,
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  milestoneInProgress: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    color: setupTheme.color.foreground,
  },
  milestoneApproved: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    color: setupTheme.color.ready,
  },
  milestoneTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
  milestoneDescription: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    lineHeight: 18,
  },
  startMilestoneButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.small,
    justifyContent: "center",
    marginTop: 6,
    paddingVertical: 6,
  },
  startMilestoneText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.caption,
    fontWeight: "800",
  },
  disabledAction: {
    opacity: 0.6,
  },
});
