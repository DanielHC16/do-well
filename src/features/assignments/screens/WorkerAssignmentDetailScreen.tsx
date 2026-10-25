import { useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import { useEffect, useRef, useState } from "react";
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
  EvidenceAttachmentPicker,
  EVIDENCE_MAX_FILE_SIZE,
  evidenceImageService,
  type EvidenceImageService,
  readImageBlob,
  submissionGateway,
  type SubmissionGateway,
} from "@/features/submissions";
import type {
  FinalizeSubmissionFileInput,
  SelectedEvidenceImage,
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

type WorkerAssignmentDetailScreenProps = Readonly<{
  assignmentId: string;
  gateway?: AssignmentGateway;
  submissionsGateway?: SubmissionGateway;
  imageService?: EvidenceImageService;
  blobReader?: (uri: string) => Promise<Blob>;
}>;

type EvidenceUploadAttempt = {
  signature: string;
  clientRequestId: string;
  fileIds: string[];
  uploadedFiles: Map<number, FinalizeSubmissionFileInput>;
};

export function WorkerAssignmentDetailScreen({
  assignmentId,
  gateway = assignmentGateway,
  submissionsGateway = submissionGateway,
  imageService = evidenceImageService,
  blobReader = readImageBlob,
}: WorkerAssignmentDetailScreenProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<AssignmentDetail | null>(null);
  const [milestones, setMilestones] = useState<MilestoneRecord[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [submissionNote, setSubmissionNote] = useState("");
  const [selectedImages, setSelectedImages] = useState<SelectedEvidenceImage[]>(
    [],
  );
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const evidenceAttemptRef = useRef<EvidenceUploadAttempt | null>(null);

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
      const updated = await gateway.startMilestone(milestoneId);
      setMilestones((prev) =>
        prev.map((m) => (m.id === milestoneId ? updated : m)),
      );
      setActionSuccess("Milestone started! Keep up the progress.");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to start milestone.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSubmitWork() {
    setActionBusy(true);
    setErrorMessage(null);
    setActionSuccess(null);
    setUploadProgress(null);
    try {
      let newSub: SubmissionRecord;
      if (selectedImages.length > 0) {
        const signature = JSON.stringify({
          note: submissionNote.trim(),
          images: selectedImages.map(({ uri, fileSize, mimeType }) => ({
            uri,
            fileSize,
            mimeType,
          })),
        });
        let attempt = evidenceAttemptRef.current;
        if (!attempt || attempt.signature !== signature) {
          attempt = {
            signature,
            clientRequestId: Crypto.randomUUID(),
            fileIds: selectedImages.map(() => Crypto.randomUUID()),
            uploadedFiles: new Map(),
          };
          evidenceAttemptRef.current = attempt;
        }

        setUploadProgress("Starting evidence submission...");
        const pendingSub = await submissionsGateway.beginSubmission({
          assignmentId,
          note: submissionNote.trim() || null,
          clientRequestId: attempt.clientRequestId,
        });

        const uploadedFiles: FinalizeSubmissionFileInput[] = [];

        for (let i = 0; i < selectedImages.length; i++) {
          const img = selectedImages[i];
          const previouslyUploaded = attempt.uploadedFiles.get(i);
          if (previouslyUploaded) {
            uploadedFiles.push(previouslyUploaded);
            continue;
          }
          setUploadProgress(
            `Uploading photo ${i + 1} of ${selectedImages.length}...`,
          );
          const fileId = attempt.fileIds[i];
          const ext =
            img.mimeType === "image/png"
              ? "png"
              : img.mimeType === "image/webp"
                ? "webp"
                : "jpg";
          const objectPath = `${pendingSub.submittedBy}/${assignmentId}/${pendingSub.id}/${fileId}.${ext}`;
          const blob = await blobReader(img.uri);
          if (blob.size < 1 || blob.size > EVIDENCE_MAX_FILE_SIZE) {
            throw new Error(
              "The selected photo changed or exceeds the 5 MB upload limit. Please choose it again.",
            );
          }
          await submissionsGateway.uploadEvidenceBlob(
            objectPath,
            blob,
            img.mimeType,
          );
          const uploadedFile = {
            object_path: objectPath,
            media_type: img.mimeType,
            size_bytes: blob.size,
          } satisfies FinalizeSubmissionFileInput;
          attempt.uploadedFiles.set(i, uploadedFile);
          uploadedFiles.push(uploadedFile);
        }

        setUploadProgress("Finalizing submission...");
        newSub = await submissionsGateway.finalizeSubmission({
          submissionId: pendingSub.id,
          files: uploadedFiles,
        });
        evidenceAttemptRef.current = null;
        setSelectedImages([]);
      } else {
        newSub = await submissionsGateway.submitAssignmentWork({
          assignmentId,
          note: submissionNote.trim() || null,
        });
      }

      setSubmissions((prev) => [newSub, ...prev]);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              assignment: {
                ...prev.assignment,
                status: "submitted",
              },
            }
          : prev,
      );
      setSubmissionNote("");
      setActionSuccess("Work successfully submitted for employer review.");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to submit work.",
      );
    } finally {
      setActionBusy(false);
      setUploadProgress(null);
    }
  }

  if (busy) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator color={setupTheme.color.accent} size="large" />
          <Text style={styles.loadingText}>Loading agreement details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>AGREEMENT NOT FOUND</Text>
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

  const { assignment, employer, gig } = detail;
  const isProposed = assignment.status === "proposed";
  const isActive = assignment.status === "active";
  const isRevision = assignment.status === "revision_requested";
  const isSubmitted = assignment.status === "submitted";
  const isCompleted = assignment.status === "completed";
  const latestSubmission = submissions[0] ?? null;

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

        {/* Revision requested alert */}
        {isRevision && latestSubmission?.reviewNote ? (
          <View style={styles.revisionCard}>
            <Text style={styles.revisionCardTitle}>REVISION REQUESTED</Text>
            <Text style={styles.revisionCardSubtitle}>
              The employer reviewed your submission and requested adjustments:
            </Text>
            <View style={styles.revisionQuoteBox}>
              <Text style={styles.revisionQuoteText}>
                {`"${latestSubmission.reviewNote}"`}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Work Submitted / Under review banner */}
        {isSubmitted ? (
          <View style={styles.submittedCard}>
            <Text style={styles.submittedCardTitle}>
              WORK SUBMITTED · UNDER REVIEW
            </Text>
            <Text style={styles.submittedCardText}>
              Your work (version {latestSubmission?.version ?? 1}) has been
              submitted to {employer.displayName} for review and approval.
            </Text>
            {latestSubmission?.note ? (
              <View style={styles.submissionNoteBox}>
                <Text style={styles.submissionNoteLabel}>YOUR NOTE:</Text>
                <Text style={styles.submissionNoteContent}>
                  {`"${latestSubmission.note}"`}
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
              This work has been reviewed and approved by the employer. The
              agreed amount is ₱{assignment.agreedAmount.toLocaleString()}.
              Payment is handled outside DO-WELL.
            </Text>
            {latestSubmission?.reviewNote ? (
              <View style={styles.completionNoteBox}>
                <Text style={styles.completionNoteLabel}>
                  EMPLOYER FEEDBACK:
                </Text>
                <Text style={styles.completionNoteContent}>
                  {`"${latestSubmission.reviewNote}"`}
                </Text>
              </View>
            ) : null}
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

        {/* Work submission form when active or revision requested */}
        {isActive || isRevision ? (
          <View style={styles.submitWorkCard}>
            <Text style={styles.submitWorkTitle}>SUBMIT COMPLETED WORK</Text>
            <Text style={styles.submitWorkSubtitle}>
              {isRevision
                ? "Address the employer's requested adjustments and submit the revised work note."
                : "Once you have finished the work according to the agreed scope, submit your completion note for employer review."}
            </Text>
            <TextInput
              accessibilityLabel="Completion notes"
              multiline
              numberOfLines={4}
              style={styles.submissionInput}
              placeholder="Describe what has been completed, access details, or notes for the employer..."
              placeholderTextColor={setupTheme.color.muted}
              value={submissionNote}
              onChangeText={setSubmissionNote}
              maxLength={2000}
            />
            <Text style={styles.charCount}>
              {submissionNote.length} / 2000 characters
            </Text>
            <EvidenceAttachmentPicker
              disabled={actionBusy}
              onAddImage={(img) => setSelectedImages((prev) => [...prev, img])}
              onRemoveImage={(idx) =>
                setSelectedImages((prev) => prev.filter((_, i) => i !== idx))
              }
              selectedImages={selectedImages}
              service={imageService}
            />

            {uploadProgress ? (
              <View style={styles.uploadProgressBox}>
                <ActivityIndicator
                  color={setupTheme.color.accent}
                  size="small"
                />
                <Text style={styles.uploadProgressText}>{uploadProgress}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Submit work for review"
              disabled={actionBusy}
              onPress={handleSubmitWork}
              style={[
                styles.submitWorkButton,
                actionBusy && styles.disabledAction,
              ]}
            >
              {actionBusy ? (
                <ActivityIndicator color={setupTheme.color.surface} />
              ) : (
                <Text style={styles.submitWorkButtonText}>
                  {isRevision
                    ? "Submit Revised Work"
                    : "Submit Work for Review"}
                </Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {/* Milestones list */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>
            MILESTONES ({milestones.length})
          </Text>
          {milestones.length === 0 ? (
            <Text style={styles.emptyNote}>
              No structured milestones have been defined yet. Work directly
              under the agreed scope.
            </Text>
          ) : (
            <View style={styles.milestonesList}>
              {milestones.map((m) => {
                const canStart = isActive && m.status === "pending";
                return (
                  <View key={m.id} style={styles.milestoneItem}>
                    <View style={styles.milestoneTopRow}>
                      <View style={styles.positionBadge}>
                        <Text style={styles.positionText}>#{m.position}</Text>
                      </View>
                      <Text style={styles.milestoneTitle}>{m.title}</Text>
                      <Text
                        style={[
                          styles.milestoneStatus,
                          m.status === "pending" &&
                            styles.milestoneStatusPending,
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
                    {canStart ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Start milestone: ${m.title}`}
                        disabled={actionBusy}
                        onPress={() => handleStartMilestone(m.id)}
                        style={[
                          styles.startMilestoneButton,
                          actionBusy && styles.disabledAction,
                        ]}
                      >
                        <Text style={styles.startMilestoneText}>
                          Begin This Step &rarr;
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Submission history if versions exist */}
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
                        EMPLOYER REVIEW:
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

        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/(protected)/reports/new" as unknown as Parameters<
                typeof router.push
              >[0],
              params: {
                targetType: "assignment",
                targetId: assignment.id,
                targetTitle: assignment.agreedTitle,
              },
            } as unknown as Parameters<typeof router.push>[0])
          }
          style={styles.reportIssueButton}
        >
          <Text style={styles.reportIssueText}>
            Report an issue with this assignment
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: setupTheme.color.background,
    flex: 1,
  },
  reportIssueButton: {
    alignItems: "center",
    marginTop: setupTheme.spacing.compact,
    paddingVertical: setupTheme.spacing.compact,
  },
  reportIssueText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    textDecorationLine: "underline",
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
  actionCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.warning,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  actionCardTitle: {
    color: setupTheme.color.warning,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 1,
  },
  actionCardText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
  },
  decisionRow: {
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    marginTop: setupTheme.spacing.tight,
  },
  confirmButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    flex: 2,
    justifyContent: "center",
    paddingVertical: setupTheme.spacing.compact,
  },
  confirmButtonText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
  declineButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    paddingVertical: setupTheme.spacing.compact,
  },
  declineButtonText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  revisionCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.accentSurface,
    borderColor: setupTheme.color.accent,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  revisionCardTitle: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 1,
  },
  revisionCardSubtitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 20,
  },
  revisionQuoteBox: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    padding: setupTheme.spacing.compact,
  },
  revisionQuoteText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontStyle: "italic",
    lineHeight: 20,
  },
  submittedCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  submittedCardTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 1,
  },
  submittedCardText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
  },
  submissionNoteBox: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    padding: setupTheme.spacing.compact,
  },
  submissionNoteLabel: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
  },
  submissionNoteContent: {
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
  completionNoteBox: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    padding: setupTheme.spacing.compact,
  },
  completionNoteLabel: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
  },
  completionNoteContent: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontStyle: "italic",
    marginTop: 2,
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
  submitWorkCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  submitWorkTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 1,
  },
  submitWorkSubtitle: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    lineHeight: 18,
  },
  submissionInput: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    minHeight: 90,
    padding: setupTheme.spacing.compact,
    textAlignVertical: "top",
  },
  charCount: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    textAlign: "right",
  },
  submitWorkButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    justifyContent: "center",
    marginTop: setupTheme.spacing.tight,
    paddingVertical: setupTheme.spacing.compact,
  },
  submitWorkButtonText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
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
  startMilestoneButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    justifyContent: "center",
    marginTop: setupTheme.spacing.tight,
    paddingVertical: setupTheme.spacing.compact,
  },
  startMilestoneText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.caption,
    fontWeight: "900",
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
  uploadProgressBox: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surfaceMuted,
    borderRadius: setupTheme.radius.control,
    flexDirection: "row",
    gap: setupTheme.spacing.tight,
    marginVertical: setupTheme.spacing.tight,
    padding: setupTheme.spacing.compact,
  },
  uploadProgressText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "600",
  },
});
