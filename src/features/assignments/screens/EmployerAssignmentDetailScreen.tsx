import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

type EmployerAssignmentDetailScreenProps = Readonly<{
  assignmentId: string;
  gateway?: AssignmentGateway;
}>;

export function EmployerAssignmentDetailScreen({
  assignmentId,
  gateway = assignmentGateway,
}: EmployerAssignmentDetailScreenProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<AssignmentDetail | null>(null);
  const [milestones, setMilestones] = useState<MilestoneRecord[]>([]);
  const [busy, setBusy] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New milestone form state
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDescription, setMilestoneDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

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

  async function handleCancelProposal() {
    setActionBusy(true);
    setErrorMessage(null);
    setActionSuccess(null);
    try {
      const updated = await gateway.cancelProposedAssignment(assignmentId);
      setDetail((prev) => (prev ? { ...prev, assignment: updated } : prev));
      setActionSuccess("Assignment proposal cancelled. Gig notice reopened.");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to cancel proposal.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleCreateMilestone() {
    const cleanTitle = milestoneTitle.trim();
    if (cleanTitle.length < 2 || cleanTitle.length > 100) {
      setFormError("Milestone title must be between 2 and 100 characters.");
      return;
    }

    const cleanDesc = milestoneDescription.trim();
    if (cleanDesc.length > 1000) {
      setFormError("Description cannot exceed 1000 characters.");
      return;
    }

    setActionBusy(true);
    setFormError(null);
    setErrorMessage(null);
    setActionSuccess(null);
    try {
      const created = await gateway.createMilestone({
        assignmentId,
        title: cleanTitle,
        description: cleanDesc.length > 0 ? cleanDesc : null,
      });
      setMilestones((prev) => [...prev, created]);
      setMilestoneTitle("");
      setMilestoneDescription("");
      setShowMilestoneForm(false);
      setActionSuccess(`Added Milestone ${created.position}: ${created.title}`);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create milestone.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  if (busy) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator color={setupTheme.color.foreground} />
        <Text style={styles.loadingText}>Loading assignment...</Text>
      </SafeAreaView>
    );
  }

  if (errorMessage && !detail) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>ASSIGNMENT UNAVAILABLE</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/(protected)/employer")}
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

  const { assignment, worker, gig } = detail;
  const isProposed = assignment.status === "proposed";
  const canAddMilestones =
    (assignment.status === "proposed" || assignment.status === "active") &&
    milestones.length < 20;

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

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroKicker}>ASSIGNED CONTRACT</Text>
          <Text style={styles.heroTitle}>{assignment.agreedTitle}</Text>
          <View style={styles.participantRow}>
            <View>
              <Text style={styles.participantLabel}>SELECTED WORKER</Text>
              <Text style={styles.participantName}>{worker.displayName}</Text>
              {worker.homeArea ? (
                <Text style={styles.participantArea}>{worker.homeArea}</Text>
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

        {/* Proposed status notice with cancel action */}
        {isProposed ? (
          <View style={styles.proposedCard}>
            <Text style={styles.proposedCardTitle}>
              AWAITING WORKER ACCEPTANCE
            </Text>
            <Text style={styles.proposedCardText}>
              You selected {worker.displayName} for this gig. The agreement is
              proposed and pending the worker&apos;s confirmation before work
              can begin.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel agreement proposal"
              disabled={actionBusy}
              onPress={handleCancelProposal}
              style={[
                styles.cancelProposalButton,
                actionBusy && styles.disabledAction,
              ]}
            >
              {actionBusy ? (
                <ActivityIndicator color={setupTheme.color.danger} />
              ) : (
                <Text style={styles.cancelProposalText}>
                  Cancel Proposal and Reopen Gig
                </Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {/* Scope of Work */}
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

        {/* Milestones Management */}
        <View style={styles.sectionCard}>
          <View style={styles.milestonesHeaderRow}>
            <Text style={styles.sectionTitle}>
              ORDERED MILESTONES ({milestones.length})
            </Text>
            {canAddMilestones && !showMilestoneForm ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add milestone"
                onPress={() => setShowMilestoneForm(true)}
                style={styles.addMilestoneSmallButton}
              >
                <Text style={styles.addMilestoneSmallText}>+ Add Step</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Inline Milestone Creation Form */}
          {showMilestoneForm ? (
            <View style={styles.milestoneForm}>
              <Text style={styles.formTitle}>
                NEW MILESTONE (STEP {milestones.length + 1})
              </Text>
              {formError ? (
                <Text style={styles.formErrorText}>{formError}</Text>
              ) : null}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>MILESTONE TITLE *</Text>
                <TextInput
                  accessibilityLabel="Milestone title input"
                  maxLength={100}
                  onChangeText={setMilestoneTitle}
                  placeholder="e.g. Rough framing and measurement"
                  placeholderTextColor={setupTheme.color.muted}
                  style={styles.textInput}
                  value={milestoneTitle}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>DESCRIPTION (OPTIONAL)</Text>
                <TextInput
                  accessibilityLabel="Milestone description input"
                  maxLength={1000}
                  multiline
                  numberOfLines={3}
                  onChangeText={setMilestoneDescription}
                  placeholder="Specific tasks or deliverables expected..."
                  placeholderTextColor={setupTheme.color.muted}
                  style={[styles.textInput, styles.textArea]}
                  value={milestoneDescription}
                />
              </View>
              <View style={styles.formButtonRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save milestone"
                  disabled={actionBusy}
                  onPress={handleCreateMilestone}
                  style={[
                    styles.saveMilestoneButton,
                    actionBusy && styles.disabledAction,
                  ]}
                >
                  {actionBusy ? (
                    <ActivityIndicator color={setupTheme.color.surface} />
                  ) : (
                    <Text style={styles.saveMilestoneButtonText}>
                      Save Step
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel adding milestone"
                  disabled={actionBusy}
                  onPress={() => {
                    setShowMilestoneForm(false);
                    setFormError(null);
                  }}
                  style={styles.cancelFormButton}
                >
                  <Text style={styles.cancelFormButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {milestones.length === 0 && !showMilestoneForm ? (
            <Text style={styles.emptyText}>
              No milestones defined yet. You can break down this project into
              ordered steps for structured tracking.
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
  proposedCard: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  proposedCardTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
  },
  proposedCardText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
  },
  cancelProposalButton: {
    alignItems: "center",
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1.5,
    justifyContent: "center",
    marginTop: 4,
    minHeight: 44,
    paddingVertical: setupTheme.spacing.compact,
  },
  cancelProposalText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.caption,
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
  milestonesHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
  },
  addMilestoneSmallButton: {
    backgroundColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.small,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addMilestoneSmallText: {
    color: setupTheme.color.surface,
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
  milestoneForm: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1.5,
    gap: setupTheme.spacing.compact,
    marginBottom: setupTheme.spacing.compact,
    padding: setupTheme.spacing.compact,
  },
  formTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
  },
  formErrorText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "800",
  },
  textInput: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1.5,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    paddingHorizontal: setupTheme.spacing.compact,
    paddingVertical: 8,
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  formButtonRow: {
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    marginTop: 4,
  },
  saveMilestoneButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.small,
    flex: 2,
    justifyContent: "center",
    minHeight: 40,
    paddingVertical: 8,
  },
  saveMilestoneButtonText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.caption,
    fontWeight: "900",
  },
  cancelFormButton: {
    alignItems: "center",
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingVertical: 8,
  },
  cancelFormButtonText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "800",
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
  disabledAction: {
    opacity: 0.6,
  },
});
