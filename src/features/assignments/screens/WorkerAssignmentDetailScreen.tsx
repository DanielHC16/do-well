import { useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text, TextInput } from "@/shared/ui/Typography";
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
  userId?: string;
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
  userId,
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
  const [relatedError, setRelatedError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const evidenceAttemptRef = useRef<EvidenceUploadAttempt | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      gateway.getAssignmentDetail(assignmentId, userId),
      gateway.listMilestones(assignmentId),
      submissionsGateway.listAssignmentSubmissions(assignmentId),
    ])
      .then(([detailData, milestonesData, submissionsData]) => {
        if (!mounted) return;
        if (detailData.status === "rejected") throw detailData.reason;
        setDetail(detailData.value);
        if (milestonesData.status === "fulfilled")
          setMilestones(milestonesData.value);
        if (submissionsData.status === "fulfilled")
          setSubmissions(submissionsData.value);
        setRelatedError(
          milestonesData.status === "rejected" ||
            submissionsData.status === "rejected"
            ? "Milestones or submissions could not be loaded. Try again."
            : null,
        );
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
  }, [assignmentId, gateway, submissionsGateway, reload, userId]);

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
            <Text style={styles.errorTitle}>Agreement not found</Text>
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
  const countedMilestones = milestones.filter(
    (milestone) => milestone.status !== "cancelled",
  );
  const approvedMilestones = countedMilestones.filter(
    (milestone) => milestone.status === "approved",
  ).length;
  const latestSubmission = submissions[0] ?? null;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
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
          {relatedError ? (
            <View accessibilityRole="alert" style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{relatedError}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry work details"
                onPress={() => {
                  setBusy(true);
                  setReload((value) => value + 1);
                }}
                style={styles.navBack}
              >
                <Text style={styles.navBackText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.heroCard}>
            <Text style={styles.heroKicker}>Task agreement</Text>
            <Text style={styles.heroTitle}>{assignment.agreedTitle}</Text>
            {assignment.dueAt ? (
              <Text style={styles.participantArea}>
                Work deadline:{" "}
                {new Date(assignment.dueAt).toLocaleString("en-PH")}
              </Text>
            ) : null}
            <View style={styles.participantRow}>
              <View style={styles.participantIdentity}>
                <Text style={styles.participantLabel}>Employer</Text>
                <Text style={styles.participantName}>
                  {employer.displayName}
                </Text>
                {employer.homeArea ? (
                  <Text style={styles.participantArea}>
                    {employer.homeArea}
                  </Text>
                ) : null}
              </View>
              <View style={styles.amountBox}>
                <Text style={styles.amountLabel}>Agreed payment</Text>
                <Text style={styles.amountValue}>
                  ₱{assignment.agreedAmount.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Action card for proposed state */}
          {isProposed ? (
            <View style={styles.actionCard}>
              <Text style={styles.actionCardTitle}>Review and confirm</Text>
              <Text style={styles.actionCardText}>
                The employer has selected you for this gig. Please review the
                terms and scope of work below. Confirming locks the agreement
                and begins the assignment.
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
                    <Text style={styles.confirmButtonText}>
                      Accept Agreement
                    </Text>
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
              <Text style={styles.revisionCardTitle}>Revision requested</Text>
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
                Work submitted · under review
              </Text>
              <Text style={styles.submittedCardText}>
                Your work (version {latestSubmission?.version ?? 1}) has been
                submitted to {employer.displayName} for review and approval.
              </Text>
              {latestSubmission?.note ? (
                <View style={styles.submissionNoteBox}>
                  <Text style={styles.submissionNoteLabel}>Your note:</Text>
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
              <Text style={styles.completedCardTitle}>Contract completed</Text>
              <Text style={styles.completedCardText}>
                This work has been reviewed and approved by the employer. The
                agreed amount is ₱{assignment.agreedAmount.toLocaleString()}.
                Payment is handled outside DO-WELL.
              </Text>
              {latestSubmission?.reviewNote ? (
                <View style={styles.completionNoteBox}>
                  <Text style={styles.completionNoteLabel}>
                    Employer feedback:
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
            <Text style={styles.sectionHeader}>Scope of work</Text>
            <Text style={styles.scopeDescription}>
              {assignment.agreedDescription}
            </Text>
            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Work mode</Text>
                <Text style={styles.metaValue}>
                  {gig.workMode.toUpperCase()}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Category</Text>
                <Text style={styles.metaValue}>
                  {gig.category.toUpperCase()}
                </Text>
              </View>
              {gig.publicArea ? (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Area</Text>
                  <Text style={styles.metaValue}>{gig.publicArea}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Work submission form when active or revision requested */}
          {!relatedError && (isActive || isRevision) ? (
            <View style={styles.submitWorkCard}>
              <Text style={styles.submitWorkTitle}>Submit completed work</Text>
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
                onAddImage={(img) =>
                  setSelectedImages((prev) => [...prev, img])
                }
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
                  <Text style={styles.uploadProgressText}>
                    {uploadProgress}
                  </Text>
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
          {!relatedError ? (
            <View style={styles.sectionCard}>
              <Text style={styles.emptyNote}>
                {approvedMilestones} of {countedMilestones.length} milestones
                approved
              </Text>
              {countedMilestones.length > 0 ? (
                <View
                  accessibilityRole="progressbar"
                  accessibilityLabel="Approved milestone progress"
                  accessibilityValue={{
                    min: 0,
                    max: countedMilestones.length,
                    now: approvedMilestones,
                  }}
                  style={styles.progressTrack}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.round((approvedMilestones / countedMilestones.length) * 100)}%`,
                      },
                    ]}
                  />
                </View>
              ) : null}
              <Text style={styles.sectionHeader}>
                Milestones ({milestones.length})
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
                            <Text style={styles.positionText}>
                              #{m.position}
                            </Text>
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
                        {m.dueAt ? (
                          <Text style={styles.milestoneDescription}>
                            Milestone deadline:{" "}
                            {new Date(m.dueAt).toLocaleString("en-PH")}
                          </Text>
                        ) : null}
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
          ) : null}

          {/* Submission history if versions exist */}
          {!relatedError && submissions.length > 0 ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeader}>
                Submission history ({submissions.length})
              </Text>
              <View style={styles.milestonesList}>
                {submissions.map((sub) => (
                  <View key={sub.id} style={styles.historyItem}>
                    <View style={styles.historyTopRow}>
                      <Text style={styles.historyVersion}>
                        Version {sub.version}
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
                          Employer review:
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  participantIdentity: { flex: 1, minWidth: 120 },
  progressTrack: {
    height: setupTheme.spacing.compact,
    backgroundColor: setupTheme.color.accentSurface,
    borderRadius: setupTheme.radius.status,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: setupTheme.color.primary,
    borderRadius: setupTheme.radius.status,
  },
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
    alignSelf: "center",
    maxWidth: setupTheme.size.contentMax,
    width: "100%",
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
    borderWidth: 1,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
    width: "100%",
  },
  errorTitle: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
  },
  errorText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
  },
  backButton: {
    minHeight: setupTheme.size.touchTarget,
    alignItems: "center",
    backgroundColor: setupTheme.color.primary,
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
    paddingBottom: setupTheme.spacing.compact,
    borderBottomColor: setupTheme.color.border,
    borderBottomWidth: 1,
    gap: setupTheme.spacing.compact,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  navBack: {
    justifyContent: "center",
    minHeight: setupTheme.size.touchTarget,
    paddingVertical: setupTheme.spacing.tight,
  },
  navBackText: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.body,
    fontWeight: "500",
  },
  statusBadge: {
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
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
    borderWidth: 1,
    gap: setupTheme.spacing.compact + setupTheme.spacing.tight,
    padding: setupTheme.spacing.section,
  },
  heroKicker: {
    alignSelf: "flex-start",
    borderRadius: setupTheme.radius.small,
    paddingVertical: setupTheme.spacing.tight,
    paddingHorizontal: setupTheme.spacing.compact,
    backgroundColor: setupTheme.color.accentSurface,
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.label,
    fontWeight: "500",
  },
  heroTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "600",
    lineHeight: 28,
  },
  participantRow: {
    borderTopColor: setupTheme.color.borderSoft,
    borderTopWidth: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: setupTheme.spacing.compact,
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
    fontSize: setupTheme.type.cardTitle,
    fontWeight: "600",
  },
  participantArea: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
  },
  amountBox: {
    borderRadius: setupTheme.radius.control,
    padding: setupTheme.spacing.compact + setupTheme.spacing.tight,
    backgroundColor: setupTheme.color.accentSurface,
    justifyContent: "space-between",
    gap: setupTheme.spacing.compact,
    flexWrap: "wrap",
    flexDirection: "row",
    flexBasis: "100%",
    alignItems: "center",
  },
  amountLabel: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
  },
  amountValue: {
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.heading,
    fontWeight: "700",
  },
  actionCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.warning,
    borderRadius: setupTheme.radius.card,
    borderWidth: 1,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  actionCardTitle: {
    lineHeight: 26,
    color: setupTheme.color.warning,
    fontSize: setupTheme.type.section,
    fontWeight: "600",
  },
  actionCardText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
  },
  decisionRow: {
    flexWrap: "wrap",
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    marginTop: setupTheme.spacing.tight,
  },
  confirmButton: {
    paddingHorizontal: setupTheme.spacing.section,
    minHeight: setupTheme.size.button,
    borderColor: setupTheme.color.primary,
    alignItems: "center",
    backgroundColor: setupTheme.color.primary,
    borderRadius: setupTheme.radius.control,
    flex: 2,
    justifyContent: "center",
    paddingVertical: setupTheme.spacing.compact,
  },
  confirmButtonText: {
    textAlign: "center",
    color: setupTheme.color.onPrimary,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
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
    borderWidth: 1,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  revisionCardTitle: {
    lineHeight: 26,
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.section,
    fontWeight: "600",
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
    borderWidth: 1,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  submittedCardTitle: {
    lineHeight: 26,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.section,
    fontWeight: "600",
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
    borderWidth: 1,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  completedCardTitle: {
    lineHeight: 26,
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.section,
    fontWeight: "600",
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
    borderWidth: 1,
    gap: setupTheme.spacing.compact + setupTheme.spacing.tight,
    padding: setupTheme.spacing.section,
  },
  sectionHeader: {
    lineHeight: 24,
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.section,
    fontWeight: "600",
  },
  scopeDescription: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 24,
  },
  metaGrid: {
    flexWrap: "wrap",
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
    fontWeight: "700",
  },
  submitWorkCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.card,
    borderWidth: 1,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  submitWorkTitle: {
    lineHeight: 26,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.section,
    fontWeight: "600",
  },
  submitWorkSubtitle: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    lineHeight: 18,
  },
  submissionInput: {
    paddingVertical: setupTheme.spacing.compact,
    fontWeight: "400",
    backgroundColor: setupTheme.color.surface,
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
    paddingHorizontal: setupTheme.spacing.section,
    minHeight: setupTheme.size.button,
    borderColor: setupTheme.color.primary,
    alignItems: "center",
    backgroundColor: setupTheme.color.primary,
    borderRadius: setupTheme.radius.control,
    justifyContent: "center",
    marginTop: setupTheme.spacing.tight,
    paddingVertical: setupTheme.spacing.compact,
  },
  submitWorkButtonText: {
    textAlign: "center",
    color: setupTheme.color.onPrimary,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
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
    backgroundColor: setupTheme.color.background,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.compact + setupTheme.spacing.tight,
  },
  milestoneTopRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: setupTheme.spacing.compact,
  },
  positionBadge: {
    alignItems: "center",
    justifyContent: "center",
    height: 32,
    width: 32,
    backgroundColor: setupTheme.color.accentSurface,
    borderRadius: setupTheme.radius.small,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  positionText: {
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.label,
    fontWeight: "600",
  },
  milestoneTitle: {
    lineHeight: 24,
    color: setupTheme.color.foreground,
    flex: 1,
    fontSize: setupTheme.type.cardTitle,
    fontWeight: "600",
  },
  milestoneStatus: {
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    fontSize: setupTheme.type.label,
    fontWeight: "500",
    overflow: "hidden",
    paddingHorizontal: setupTheme.spacing.compact,
    paddingVertical: setupTheme.spacing.tight,
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
    fontSize: setupTheme.type.body,
    lineHeight: 22,
  },
  startMilestoneButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.primary,
    borderRadius: setupTheme.radius.control,
    justifyContent: "center",
    marginTop: setupTheme.spacing.tight,
    paddingVertical: setupTheme.spacing.compact,
  },
  startMilestoneText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
  },
  historyItem: {
    backgroundColor: setupTheme.color.background,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    gap: setupTheme.spacing.tight,
    padding: setupTheme.spacing.compact,
  },
  historyTopRow: {
    flexWrap: "wrap",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  historyVersion: {
    backgroundColor: setupTheme.color.accentSurface,
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.label,
    fontWeight: "600",
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
