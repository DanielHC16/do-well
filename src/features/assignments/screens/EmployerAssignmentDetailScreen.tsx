import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
  submissionGateway,
  type SubmissionGateway,
} from "@/features/submissions/data/submission-gateway";
import type {
  SubmissionFileRecord,
  SubmissionRecord,
} from "@/features/submissions/model/submission-schemas";

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
  submissionsGateway?: SubmissionGateway;
}>;

export function EmployerAssignmentDetailScreen({
  assignmentId,
  gateway = assignmentGateway,
  submissionsGateway = submissionGateway,
}: EmployerAssignmentDetailScreenProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<AssignmentDetail | null>(null);
  const [milestones, setMilestones] = useState<MilestoneRecord[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<SubmissionFileRecord[]>(
    [],
  );
  const [evidenceSignedUrls, setEvidenceSignedUrls] = useState<
    Record<string, string>
  >({});
  const [loadedSubmissionId, setLoadedSubmissionId] = useState<string | null>(
    null,
  );
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [evidenceReload, setEvidenceReload] = useState(0);
  const [busy, setBusy] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New milestone form state
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDescription, setMilestoneDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Revision request form state
  const [isRequestingRevision, setIsRequestingRevision] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");

  useEffect(() => {
    let mounted = true;

    Promise.all([
      gateway.getAssignmentDetail(assignmentId),
      gateway.listMilestones(assignmentId).catch(() => []),
      submissionsGateway
        .listAssignmentSubmissions(assignmentId)
        .catch(() => []),
    ])
      .then(([detailData, milestonesData, submissionsData]) => {
        if (!mounted) return;
        setDetail(detailData);
        setMilestones(milestonesData);
        setSubmissions(submissionsData);
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
  }, [assignmentId, gateway, submissionsGateway]);

  useEffect(() => {
    let mounted = true;
    const latestId = submissions[0]?.id;
    if (!latestId) {
      return;
    }
    submissionsGateway
      .listSubmissionFiles(latestId)
      .then(async (files) => {
        if (!mounted) return;
        setEvidenceFiles(files);
        setEvidenceError(null);
        const urlMap: Record<string, string> = {};
        await Promise.all(
          files.map(async (file) => {
            const url = await submissionsGateway.createEvidenceSignedUrl(
              file.objectPath,
            );
            urlMap[file.id] = url;
          }),
        );
        if (!mounted) return;
        setEvidenceSignedUrls(urlMap);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setEvidenceFiles([]);
        setEvidenceSignedUrls({});
        setEvidenceError(
          error instanceof Error
            ? error.message
            : "Unable to securely load the attached evidence.",
        );
      })
      .finally(() => {
        if (!mounted) return;
        setLoadedSubmissionId(latestId);
      });

    return () => {
      mounted = false;
    };
  }, [evidenceReload, submissions, submissionsGateway]);

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
    const cleanDesc = milestoneDescription.trim() || undefined;

    setActionBusy(true);
    setFormError(null);
    setErrorMessage(null);
    setActionSuccess(null);
    try {
      const created = await gateway.createMilestone({
        assignmentId,
        title: cleanTitle,
        description: cleanDesc,
      });
      setMilestones((prev) => [...prev, created]);
      setMilestoneTitle("");
      setMilestoneDescription("");
      setShowMilestoneForm(false);
      setActionSuccess("Milestone step added successfully.");
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create milestone.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleApproveCompletion() {
    const latest = submissions[0];
    if (!latest) return;

    setActionBusy(true);
    setErrorMessage(null);
    setActionSuccess(null);
    try {
      const updatedSub = await submissionsGateway.approveAssignmentCompletion({
        submissionId: latest.id,
      });
      setSubmissions((prev) => [
        updatedSub,
        ...prev.filter((s) => s.id !== updatedSub.id),
      ]);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              assignment: {
                ...prev.assignment,
                status: "completed",
                completedAt: new Date().toISOString(),
              },
            }
          : prev,
      );
      setMilestones((prev) =>
        prev.map((m) => ({
          ...m,
          status: "approved",
          approvedAt: m.approvedAt ?? new Date().toISOString(),
        })),
      );
      setActionSuccess("Work approved and task agreement completed!");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to approve completion.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSendRevision() {
    const latest = submissions[0];
    const cleanNote = revisionNote.trim();
    if (!latest || !cleanNote) return;

    setActionBusy(true);
    setErrorMessage(null);
    setActionSuccess(null);
    try {
      const updatedSub = await submissionsGateway.requestSubmissionRevision({
        submissionId: latest.id,
        reviewNote: cleanNote,
      });
      setSubmissions((prev) => [
        updatedSub,
        ...prev.filter((s) => s.id !== updatedSub.id),
      ]);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              assignment: {
                ...prev.assignment,
                status: "revision_requested",
              },
            }
          : prev,
      );
      setIsRequestingRevision(false);
      setRevisionNote("");
      setActionSuccess(
        "Revision requested. The worker has been notified to make adjustments.",
      );
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to request revision.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  if (busy) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator color={setupTheme.color.accent} size="large" />
          <Text style={styles.loadingText}>Loading contract details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>CONTRACT NOT FOUND</Text>
            <Text style={styles.errorText}>
              {errorMessage ??
                "This agreement record does not exist or you do not have permission to view it."}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to workspace"
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>Return to workspace</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const { assignment, worker, gig } = detail;
  const isProposed = assignment.status === "proposed";
  const isActive = assignment.status === "active";
  const isSubmitted = assignment.status === "submitted";
  const isRevision = assignment.status === "revision_requested";
  const isCompleted = assignment.status === "completed";
  const latestSubmission = submissions[0] ?? null;
  const loadingEvidence = Boolean(
    latestSubmission && loadedSubmissionId !== latestSubmission.id,
  );
  const evidenceContent = loadingEvidence ? (
    <View style={styles.evidenceLoadingBox}>
      <ActivityIndicator color={setupTheme.color.accent} size="small" />
      <Text style={styles.evidenceLoadingText}>
        Loading attached photo evidence...
      </Text>
    </View>
  ) : evidenceError ? (
    <View accessibilityLiveRegion="polite" style={styles.evidenceErrorBox}>
      <Text style={styles.evidenceErrorText}>
        Evidence could not be verified: {evidenceError}
      </Text>
      <Pressable
        accessibilityLabel="Retry loading photo evidence"
        accessibilityRole="button"
        onPress={() => {
          setLoadedSubmissionId(null);
          setEvidenceReload((value) => value + 1);
        }}
        style={styles.evidenceRetryButton}
      >
        <Text style={styles.evidenceRetryButtonText}>Retry evidence</Text>
      </Pressable>
    </View>
  ) : evidenceFiles.length > 0 ? (
    <View style={styles.evidenceSection}>
      <Text style={styles.evidenceSectionTitle}>
        PHOTO EVIDENCE ({evidenceFiles.length})
      </Text>
      <View style={styles.evidenceGrid}>
        {evidenceFiles.map((file) => {
          const signedUrl = evidenceSignedUrls[file.id];
          return (
            <View key={file.id} style={styles.evidenceCard}>
              {signedUrl ? (
                <Image
                  accessibilityLabel={`Attached photo evidence ${file.id}`}
                  resizeMode="cover"
                  source={{ uri: signedUrl }}
                  style={styles.evidenceImage}
                />
              ) : (
                <View style={styles.evidencePlaceholder}>
                  <ActivityIndicator
                    color={setupTheme.color.muted}
                    size="small"
                  />
                </View>
              )}
              <Text style={styles.evidenceFileMeta}>
                {(file.sizeBytes / 1024).toFixed(0)} KB ·{" "}
                {file.mediaType.split("/")[1]?.toUpperCase() ?? "IMG"}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  ) : null;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to workspace"
            onPress={() => router.back()}
            style={styles.navBack}
          >
            <Text style={styles.navBackText}>&larr; Back</Text>
          </Pressable>
          <Text
            style={[
              styles.statusBadge,
              isProposed && styles.statusProposed,
              isActive && styles.statusActive,
              isSubmitted && styles.statusSubmitted,
              isRevision && styles.statusRevision,
              isCompleted && styles.statusCompleted,
              (assignment.status === "declined" ||
                assignment.status === "cancelled") &&
                styles.statusTerminated,
            ]}
          >
            {assignment.status.replace(/_/g, " ").toUpperCase()}
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

        {/* Title and Worker card */}
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
              <Text style={styles.cancelProposalButtonText}>
                Cancel Selection & Reopen Gig
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Work review card when submitted */}
        {isSubmitted ? (
          <View style={styles.reviewCard}>
            <Text style={styles.reviewCardTitle}>
              WORK SUBMITTED · AWAITING YOUR REVIEW
            </Text>
            <Text style={styles.reviewCardSubtitle}>
              {worker.displayName} has submitted completed work (version{" "}
              {latestSubmission?.version ?? 1}) for your approval:
            </Text>
            {latestSubmission?.note ? (
              <View style={styles.workerNoteBox}>
                <Text style={styles.workerNoteLabel}>WORKER NOTE:</Text>
                <Text style={styles.workerNoteText}>
                  {`"${latestSubmission.note}"`}
                </Text>
              </View>
            ) : null}

            {evidenceContent}

            {isRequestingRevision ? (
              <View style={styles.revisionFormBox}>
                <Text style={styles.revisionFormTitle}>
                  SPECIFY REVISION INSTRUCTIONS
                </Text>
                <TextInput
                  accessibilityLabel="Revision feedback note"
                  multiline
                  numberOfLines={3}
                  style={styles.revisionInput}
                  placeholder="Detail exactly what needs correction or completion before you can approve..."
                  placeholderTextColor={setupTheme.color.muted}
                  value={revisionNote}
                  onChangeText={setRevisionNote}
                  maxLength={2000}
                />
                <View style={styles.revisionActionRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Send revision request"
                    disabled={actionBusy || !revisionNote.trim()}
                    onPress={handleSendRevision}
                    style={[
                      styles.sendRevisionButton,
                      (actionBusy || !revisionNote.trim()) &&
                        styles.disabledAction,
                    ]}
                  >
                    {actionBusy ? (
                      <ActivityIndicator color={setupTheme.color.surface} />
                    ) : (
                      <Text style={styles.sendRevisionButtonText}>
                        Send Revision Request
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancel revision form"
                    disabled={
                      actionBusy || loadingEvidence || Boolean(evidenceError)
                    }
                    onPress={() => setIsRequestingRevision(false)}
                    style={styles.cancelRevisionFormButton}
                  >
                    <Text style={styles.cancelRevisionFormText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.reviewActionsRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Approve and complete work"
                  disabled={
                    actionBusy || loadingEvidence || Boolean(evidenceError)
                  }
                  onPress={handleApproveCompletion}
                  style={[
                    styles.approveButton,
                    (actionBusy || loadingEvidence || Boolean(evidenceError)) &&
                      styles.disabledAction,
                  ]}
                >
                  {actionBusy ? (
                    <ActivityIndicator color={setupTheme.color.surface} />
                  ) : (
                    <Text style={styles.approveButtonText}>
                      Approve & Complete Work
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Request revision"
                  disabled={
                    actionBusy || loadingEvidence || Boolean(evidenceError)
                  }
                  onPress={() => setIsRequestingRevision(true)}
                  style={[
                    styles.requestRevisionButton,
                    (actionBusy || loadingEvidence || Boolean(evidenceError)) &&
                      styles.disabledAction,
                  ]}
                >
                  <Text style={styles.requestRevisionButtonText}>
                    Request Revision
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : null}

        {!isSubmitted && latestSubmission ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>LATEST PHOTO EVIDENCE</Text>
            {evidenceContent}
          </View>
        ) : null}

        {/* Revision Requested banner */}
        {isRevision ? (
          <View style={styles.revisionPendingCard}>
            <Text style={styles.revisionPendingTitle}>REVISION REQUESTED</Text>
            <Text style={styles.revisionPendingText}>
              You requested revisions from {worker.displayName}. Work is paused
              pending their updated submission.
            </Text>
            {latestSubmission?.reviewNote ? (
              <View style={styles.reviewNoteBox}>
                <Text style={styles.reviewNoteLabel}>YOUR FEEDBACK:</Text>
                <Text style={styles.reviewNoteContent}>
                  {`"${latestSubmission.reviewNote}"`}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Contract Completed banner */}
        {isCompleted ? (
          <View style={styles.completedCard}>
            <Text style={styles.completedCardTitle}>CONTRACT COMPLETED</Text>
            <Text style={styles.completedCardText}>
              Work has been reviewed and approved. Agreed amount: ₱
              {assignment.agreedAmount.toLocaleString()}. Payment is handled
              outside DO-WELL.
            </Text>
          </View>
        ) : null}

        {/* Scope of Work */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>SCOPE OF WORK</Text>
          <Text style={styles.scopeDescription}>
            {assignment.agreedDescription}
          </Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>WORK MODE</Text>
              <Text style={styles.metaValue}>{gig.workMode.toUpperCase()}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>CATEGORY</Text>
              <Text style={styles.metaValue}>{gig.category.toUpperCase()}</Text>
            </View>
            {gig.publicArea ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>AREA</Text>
                <Text style={styles.metaValue}>{gig.publicArea}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Ordered Milestones Management */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>
              ORDERED MILESTONES ({milestones.length})
            </Text>
            {isActive && !showMilestoneForm ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add milestone"
                onPress={() => setShowMilestoneForm(true)}
                style={styles.addStepButton}
              >
                <Text style={styles.addStepText}>+ Add Step</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Form to add a milestone step */}
          {showMilestoneForm ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>NEW MILESTONE STEP</Text>
              {formError ? (
                <Text style={styles.formErrorText}>{formError}</Text>
              ) : null}
              <TextInput
                accessibilityLabel="Milestone title"
                style={styles.input}
                placeholder="Step title (e.g., Mount rack fixtures)"
                placeholderTextColor={setupTheme.color.muted}
                value={milestoneTitle}
                onChangeText={setMilestoneTitle}
                maxLength={100}
              />
              <TextInput
                accessibilityLabel="Milestone description"
                multiline
                numberOfLines={3}
                style={[styles.input, styles.textArea]}
                placeholder="Optional description of tasks for this step..."
                placeholderTextColor={setupTheme.color.muted}
                value={milestoneDescription}
                onChangeText={setMilestoneDescription}
                maxLength={1000}
              />
              <View style={styles.formActionRow}>
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
                    <Text style={styles.saveMilestoneText}>Save Step</Text>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel adding milestone"
                  disabled={actionBusy}
                  onPress={() => setShowMilestoneForm(false)}
                  style={styles.cancelMilestoneButton}
                >
                  <Text style={styles.cancelMilestoneText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {milestones.length === 0 ? (
            <Text style={styles.emptyNote}>
              No milestones defined yet. You can break down this project into
              ordered steps for structured tracking.
            </Text>
          ) : (
            <View style={styles.milestonesList}>
              {milestones.map((m) => (
                <View key={m.id} style={styles.milestoneItem}>
                  <View style={styles.milestoneTopRow}>
                    <View style={styles.positionBadge}>
                      <Text style={styles.positionText}>#{m.position}</Text>
                    </View>
                    <Text style={styles.milestoneTitle}>{m.title}</Text>
                    <Text
                      style={[
                        styles.milestoneStatus,
                        m.status === "pending" && styles.milestoneStatusPending,
                        m.status === "in_progress" &&
                          styles.milestoneStatusProgress,
                        m.status === "approved" &&
                          styles.milestoneStatusApproved,
                      ]}
                    >
                      {m.status.replace(/_/g, " ").toUpperCase()}
                    </Text>
                  </View>
                  {m.description ? (
                    <Text style={styles.milestoneDescription}>
                      {m.description}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Submission history */}
        {submissions.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>
              SUBMISSION HISTORY ({submissions.length})
            </Text>
            <View style={styles.milestonesList}>
              {submissions.map((sub) => (
                <View key={sub.id} style={styles.historyItem}>
                  <View style={styles.historyTopRow}>
                    <Text style={styles.historyVersion}>
                      VERSION {sub.version}
                    </Text>
                    <Text
                      style={[
                        styles.milestoneStatus,
                        sub.status === "submitted" &&
                          styles.milestoneStatusProgress,
                        sub.status === "revision_requested" &&
                          styles.milestoneStatusPending,
                        sub.status === "approved" &&
                          styles.milestoneStatusApproved,
                      ]}
                    >
                      {sub.status.replace(/_/g, " ").toUpperCase()}
                    </Text>
                  </View>
                  {sub.note ? (
                    <Text style={styles.historyNote}>{sub.note}</Text>
                  ) : null}
                  {sub.reviewNote ? (
                    <View style={styles.historyReviewBox}>
                      <Text style={styles.historyReviewLabel}>
                        YOUR REVIEW NOTE:
                      </Text>
                      <Text style={styles.historyReviewText}>
                        {sub.reviewNote}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: setupTheme.color.background,
    flex: 1,
  },
  scrollContent: {
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
    marginTop: setupTheme.spacing.section,
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
    justifyContent: "center",
    marginTop: setupTheme.spacing.compact,
    paddingVertical: setupTheme.spacing.compact,
  },
  backButtonText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  navBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  navBack: {
    paddingVertical: setupTheme.spacing.tight,
  },
  navBackText: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  statusBadge: {
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    fontSize: setupTheme.type.caption,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: setupTheme.spacing.compact,
    paddingVertical: 2,
  },
  statusProposed: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.warning,
    color: setupTheme.color.warning,
  },
  statusActive: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    color: setupTheme.color.ready,
  },
  statusSubmitted: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    color: setupTheme.color.foreground,
  },
  statusRevision: {
    backgroundColor: setupTheme.color.accentSurface,
    borderColor: setupTheme.color.accent,
    color: setupTheme.color.accent,
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
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    padding: setupTheme.spacing.compact,
  },
  successBannerText: {
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  errorBanner: {
    backgroundColor: setupTheme.color.dangerSurface,
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    padding: setupTheme.spacing.compact,
  },
  errorBannerText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
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
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
    lineHeight: 28,
  },
  participantRow: {
    borderTopColor: setupTheme.color.borderSoft,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: setupTheme.spacing.tight,
    paddingTop: setupTheme.spacing.compact,
  },
  participantLabel: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
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
    fontWeight: "700",
  },
  amountValue: {
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  proposedCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.warning,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  proposedCardTitle: {
    color: setupTheme.color.warning,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 1,
  },
  proposedCardText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
  },
  cancelProposalButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: setupTheme.spacing.tight,
    paddingVertical: setupTheme.spacing.compact,
  },
  cancelProposalButtonText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  reviewCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  reviewCardTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 1,
  },
  reviewCardSubtitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 20,
  },
  workerNoteBox: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    padding: setupTheme.spacing.compact,
  },
  workerNoteLabel: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
  },
  workerNoteText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontStyle: "italic",
    marginTop: 2,
  },
  reviewActionsRow: {
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    marginTop: setupTheme.spacing.tight,
  },
  approveButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    flex: 2,
    justifyContent: "center",
    paddingVertical: setupTheme.spacing.compact,
  },
  approveButtonText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
  requestRevisionButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    paddingVertical: setupTheme.spacing.compact,
  },
  requestRevisionButtonText: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  revisionFormBox: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    gap: setupTheme.spacing.compact,
    marginTop: setupTheme.spacing.tight,
    padding: setupTheme.spacing.compact,
  },
  revisionFormTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
  },
  revisionInput: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    minHeight: 70,
    padding: setupTheme.spacing.compact,
    textAlignVertical: "top",
  },
  revisionActionRow: {
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
  },
  sendRevisionButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.accent,
    borderRadius: setupTheme.radius.control,
    flex: 2,
    justifyContent: "center",
    paddingVertical: setupTheme.spacing.compact,
  },
  sendRevisionButtonText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
  cancelRevisionFormButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surfaceMuted,
    borderRadius: setupTheme.radius.control,
    flex: 1,
    justifyContent: "center",
    paddingVertical: setupTheme.spacing.compact,
  },
  cancelRevisionFormText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  revisionPendingCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.accentSurface,
    borderColor: setupTheme.color.accent,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  revisionPendingTitle: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 1,
  },
  revisionPendingText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 20,
  },
  reviewNoteBox: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    padding: setupTheme.spacing.compact,
  },
  reviewNoteLabel: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
  },
  reviewNoteContent: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontStyle: "italic",
    marginTop: 2,
  },
  completedCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  completedCardTitle: {
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 1,
  },
  completedCardText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
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
  sectionHeader: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 1,
  },
  scopeDescription: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
  },
  metaGrid: {
    borderTopColor: setupTheme.color.borderSoft,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: setupTheme.spacing.section,
    marginTop: setupTheme.spacing.tight,
    paddingTop: setupTheme.spacing.compact,
  },
  metaItem: {
    gap: 2,
  },
  metaLabel: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
  },
  metaValue: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "900",
  },
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  addStepButton: {
    paddingHorizontal: setupTheme.spacing.compact,
    paddingVertical: 2,
  },
  addStepText: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.caption,
    fontWeight: "900",
  },
  formCard: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.compact,
  },
  formTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 1,
  },
  formErrorText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.caption,
  },
  input: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    padding: setupTheme.spacing.compact,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  formActionRow: {
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
  },
  saveMilestoneButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    flex: 2,
    justifyContent: "center",
    paddingVertical: setupTheme.spacing.compact,
  },
  saveMilestoneText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.caption,
    fontWeight: "900",
  },
  cancelMilestoneButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    paddingVertical: setupTheme.spacing.compact,
  },
  cancelMilestoneText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
  },
  emptyNote: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    lineHeight: 18,
  },
  milestonesList: {
    gap: setupTheme.spacing.compact,
    marginTop: setupTheme.spacing.tight,
  },
  milestoneItem: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    gap: setupTheme.spacing.tight,
    padding: setupTheme.spacing.compact,
  },
  milestoneTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
  },
  positionBadge: {
    backgroundColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.small,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  positionText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
  },
  milestoneTitle: {
    color: setupTheme.color.foreground,
    flex: 1,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  milestoneStatus: {
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: setupTheme.spacing.compact,
    paddingVertical: 2,
  },
  milestoneStatusPending: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.warning,
    color: setupTheme.color.warning,
  },
  milestoneStatusProgress: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    color: setupTheme.color.ready,
  },
  milestoneStatusApproved: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    color: setupTheme.color.ready,
  },
  milestoneDescription: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    lineHeight: 18,
  },
  historyItem: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    gap: setupTheme.spacing.tight,
    padding: setupTheme.spacing.compact,
  },
  historyTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  historyVersion: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
  },
  historyNote: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
  },
  historyReviewBox: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    marginTop: 4,
    padding: setupTheme.spacing.compact,
  },
  historyReviewLabel: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
  },
  historyReviewText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontStyle: "italic",
    marginTop: 2,
  },
  disabledAction: {
    opacity: 0.6,
  },
  evidenceLoadingBox: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surfaceMuted,
    borderRadius: setupTheme.radius.small,
    flexDirection: "row",
    gap: setupTheme.spacing.tight,
    marginTop: setupTheme.spacing.compact,
    padding: setupTheme.spacing.compact,
  },
  evidenceLoadingText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
  },
  evidenceErrorBox: {
    backgroundColor: setupTheme.color.dangerSurface,
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    gap: setupTheme.spacing.tight,
    marginTop: setupTheme.spacing.compact,
    padding: setupTheme.spacing.compact,
  },
  evidenceErrorText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
  },
  evidenceRetryButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: setupTheme.spacing.compact,
  },
  evidenceRetryButtonText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.caption,
    fontWeight: "800",
  },
  evidenceSection: {
    marginTop: setupTheme.spacing.compact,
  },
  evidenceSectionTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginBottom: setupTheme.spacing.tight,
  },
  evidenceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: setupTheme.spacing.compact,
  },
  evidenceCard: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    overflow: "hidden",
    width: 100,
  },
  evidenceImage: {
    backgroundColor: setupTheme.color.borderSoft,
    height: 100,
    width: 100,
  },
  evidencePlaceholder: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surfaceMuted,
    height: 100,
    justifyContent: "center",
    width: 100,
  },
  evidenceFileMeta: {
    color: setupTheme.color.muted,
    fontSize: 10,
    fontWeight: "600",
    padding: 4,
    textAlign: "center",
  },
});
