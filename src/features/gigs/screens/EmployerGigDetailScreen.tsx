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

import {
  applicationGateway,
  type ApplicationGateway,
} from "@/features/applications/data/application-gateway";
import type {
  ApplicantSummary,
  AssignmentRecord,
} from "@/features/applications/model/application-schemas";
import { setupTheme } from "@/features/setup/setupTheme";

import { gigGateway, type GigGateway } from "../data/gig-gateway";
import { GIG_CATEGORY_LABELS, type GigRecord } from "../model/gig-schemas";

type EmployerGigDetailScreenProps = Readonly<{
  gigId: string;
  gateway?: GigGateway;
  applications?: ApplicationGateway;
}>;

export function EmployerGigDetailScreen({
  applications = applicationGateway,
  gateway = gigGateway,
  gigId,
}: EmployerGigDetailScreenProps) {
  const router = useRouter();
  const [gig, setGig] = useState<GigRecord | null>(null);
  const [applicants, setApplicants] = useState<ApplicantSummary[]>([]);
  const [assignment, setAssignment] = useState<AssignmentRecord | null>(null);
  const [busy, setBusy] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [selectingApplicantId, setSelectingApplicantId] = useState<
    string | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    gateway
      .getGigById(gigId)
      .then(async (gigData) => {
        if (!mounted) return;
        setGig(gigData);

        if (
          gigData &&
          (gigData.status === "published" || gigData.status === "closed")
        ) {
          const [applicantsData, assignmentData] = await Promise.all([
            applications.listGigApplicants(gigId).catch(() => []),
            gigData.status === "closed"
              ? applications.getAssignmentForGig(gigId).catch(() => null)
              : Promise.resolve(null),
          ]);
          if (!mounted) return;
          setApplicants(applicantsData);
          setAssignment(assignmentData);
        }
        setErrorMessage(null);
      })
      .catch((err: unknown) => {
        if (mounted) {
          setErrorMessage(
            err instanceof Error ? err.message : "Unable to load gig details.",
          );
        }
      })
      .finally(() => {
        if (mounted) setBusy(false);
      });

    return () => {
      mounted = false;
    };
  }, [applications, gateway, gigId]);

  async function reloadGig() {
    try {
      const gigData = await gateway.getGigById(gigId);
      setGig(gigData);

      if (
        gigData &&
        (gigData.status === "published" || gigData.status === "closed")
      ) {
        const [applicantsData, assignmentData] = await Promise.all([
          applications.listGigApplicants(gigId).catch(() => []),
          gigData.status === "closed"
            ? applications.getAssignmentForGig(gigId).catch(() => null)
            : Promise.resolve(null),
        ]);
        setApplicants(applicantsData);
        setAssignment(assignmentData);
      }
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to load gig details.",
      );
    }
  }

  async function handlePublish() {
    setActionBusy(true);
    setErrorMessage(null);
    setActionSuccess(null);
    try {
      const updated = await gateway.publishGig(gigId);
      setGig(updated);
      setActionSuccess("Gig published to the noticeboard!");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to publish gig.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleClose() {
    setActionBusy(true);
    setErrorMessage(null);
    setActionSuccess(null);
    try {
      const updated = await gateway.closeGig(gigId);
      setGig(updated);
      setActionSuccess("Gig notice has been closed.");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to close gig.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSelectWorker(applicantId: string) {
    setSelectingApplicantId(applicantId);
    setErrorMessage(null);
    setActionSuccess(null);
    try {
      const newAssignment = await applications.selectWorkerAtomic({
        applicationId: applicantId,
      });
      setAssignment(newAssignment);
      setActionSuccess("Worker selected! Agreement proposed successfully.");
      await reloadGig();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to select worker.",
      );
    } finally {
      setSelectingApplicantId(null);
    }
  }

  if (busy) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator color={setupTheme.color.foreground} />
        <Text style={styles.loadingText}>Loading gig notice...</Text>
      </SafeAreaView>
    );
  }

  if (errorMessage && !gig) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>NOTICE UNAVAILABLE</Text>
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

  if (!gig) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(protected)/employer")}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Workspace</Text>
        </Pressable>
        <Text style={styles.headerStatus}>
          STATUS: {gig.status.toUpperCase()}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {actionSuccess ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{actionSuccess}</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.mainCard}>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryBadge}>
              {GIG_CATEGORY_LABELS[gig.category] ?? gig.category}
            </Text>
            <Text style={styles.modeBadge}>{gig.workMode.toUpperCase()}</Text>
          </View>

          <Text accessibilityRole="header" style={styles.title}>
            {gig.title}
          </Text>

          <View style={styles.budgetRow}>
            <Text style={styles.budgetKicker}>OFFERED COMPENSATION</Text>
            <Text style={styles.budgetAmount}>
              PHP {gig.budgetAmount.toLocaleString()}
            </Text>
          </View>

          {gig.publicArea ? (
            <View style={styles.areaRow}>
              <Text style={styles.areaLabel}>NEIGHBORHOOD AREA</Text>
              <Text style={styles.areaValue}>{gig.publicArea}</Text>
            </View>
          ) : null}

          <View style={styles.descriptionSection}>
            <Text style={styles.sectionHeader}>INSTRUCTIONS</Text>
            <Text style={styles.descriptionText}>{gig.description}</Text>
          </View>
        </View>

        {assignment ? (
          <View style={styles.assignmentCard}>
            <View style={styles.assignmentHeaderRow}>
              <Text style={styles.assignmentKicker}>ACTIVE ASSIGNMENT</Text>
              <Text style={styles.assignmentStatusBadge}>
                {assignment.status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.assignmentTitle}>{assignment.agreedTitle}</Text>
            <Text style={styles.assignmentAmount}>
              Agreed Amount: {assignment.currency}{" "}
              {assignment.agreedAmount.toLocaleString()}
            </Text>
            <Text style={styles.assignmentNote}>
              Awaiting worker confirmation to begin work (Coming in M08).
            </Text>
          </View>
        ) : null}

        {gig.status === "published" || gig.status === "closed" ? (
          <View style={styles.applicantsSection}>
            <View style={styles.applicantsHeaderRow}>
              <Text style={styles.sectionHeader}>
                APPLICANTS ({applicants.length})
              </Text>
            </View>

            {applicants.length === 0 ? (
              <View style={styles.emptyApplicantsCard}>
                <Text style={styles.emptyApplicantsText}>
                  No workers have applied yet. Once workers apply, they will
                  appear here for review.
                </Text>
              </View>
            ) : (
              <View style={styles.applicantsList}>
                {applicants.map((applicant) => (
                  <View key={applicant.id} style={styles.applicantCard}>
                    <View style={styles.applicantTopRow}>
                      <View>
                        <Text style={styles.applicantName}>
                          {applicant.workerDisplayName}
                        </Text>
                        <Text style={styles.applicantArea}>
                          {applicant.workerHomeArea ?? "Area not set"}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.applicantStatusBadge,
                          applicant.status === "accepted"
                            ? styles.statusAccepted
                            : applicant.status === "rejected"
                              ? styles.statusRejected
                              : applicant.status === "withdrawn"
                                ? styles.statusWithdrawn
                                : styles.statusPending,
                        ]}
                      >
                        {applicant.status === "accepted"
                          ? "SELECTED · HIRED"
                          : applicant.status === "withdrawn"
                            ? "WITHDRAWN"
                            : applicant.status.toUpperCase()}
                      </Text>
                    </View>

                    {applicant.message ? (
                      <View style={styles.applicantMessageBox}>
                        <Text style={styles.applicantMessageText}>
                          {`"${applicant.message}"`}
                        </Text>
                      </View>
                    ) : null}

                    {gig.status === "published" &&
                    applicant.status === "pending" ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${applicant.workerDisplayName}`}
                        disabled={selectingApplicantId !== null}
                        onPress={() => void handleSelectWorker(applicant.id)}
                        style={[
                          styles.selectWorkerButton,
                          selectingApplicantId !== null &&
                            styles.disabledAction,
                        ]}
                      >
                        {selectingApplicantId === applicant.id ? (
                          <ActivityIndicator color={setupTheme.color.surface} />
                        ) : (
                          <Text style={styles.selectWorkerButtonText}>
                            Select Worker
                          </Text>
                        )}
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.actionCard}>
          {gig.status === "draft" ? (
            <Pressable
              accessibilityRole="button"
              disabled={actionBusy}
              onPress={() => void handlePublish()}
              style={styles.primaryAction}
            >
              {actionBusy ? (
                <ActivityIndicator color={setupTheme.color.surface} />
              ) : (
                <Text style={styles.primaryActionText}>
                  Publish to Noticeboard
                </Text>
              )}
            </Pressable>
          ) : null}

          {gig.status === "published" ? (
            <Pressable
              accessibilityRole="button"
              disabled={actionBusy}
              onPress={() => void handleClose()}
              style={styles.dangerAction}
            >
              {actionBusy ? (
                <ActivityIndicator color={setupTheme.color.danger} />
              ) : (
                <Text style={styles.dangerActionText}>Close Notice</Text>
              )}
            </Pressable>
          ) : null}

          {gig.status === "closed" ? (
            <View style={styles.terminalNotice}>
              <Text style={styles.terminalText}>
                This notice is closed and no longer visible on the noticeboard.
              </Text>
            </View>
          ) : null}
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
  topBar: {
    alignItems: "center",
    borderBottomColor: setupTheme.color.border,
    borderBottomWidth: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: setupTheme.spacing.section,
    paddingVertical: setupTheme.spacing.compact,
  },
  backButton: {
    paddingVertical: setupTheme.spacing.compact,
  },
  backButtonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
  headerStatus: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  content: {
    gap: setupTheme.spacing.content,
    padding: setupTheme.spacing.section,
    paddingBottom: setupTheme.spacing.generous,
  },
  successBanner: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1.5,
    padding: setupTheme.spacing.section,
  },
  successText: {
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
  errorBanner: {
    backgroundColor: setupTheme.color.dangerSurface,
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1.5,
    padding: setupTheme.spacing.section,
  },
  errorBannerText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
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
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
  },
  mainCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.content,
    padding: setupTheme.spacing.section,
  },
  categoryRow: {
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
  },
  categoryBadge: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modeBadge: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  title: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.title,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  budgetRow: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1.5,
    gap: 4,
    padding: setupTheme.spacing.compact,
  },
  budgetKicker: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "800",
  },
  budgetAmount: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  areaRow: {
    gap: 4,
  },
  areaLabel: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "800",
  },
  areaValue: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  descriptionSection: {
    borderTopColor: setupTheme.color.borderSoft,
    borderTopWidth: 1,
    gap: setupTheme.spacing.compact,
    paddingTop: setupTheme.spacing.section,
  },
  sectionHeader: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  descriptionText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 24,
  },
  assignmentCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  assignmentHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  assignmentKicker: {
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  assignmentStatusBadge: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.ready,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    color: setupTheme.color.ready,
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  assignmentTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  assignmentAmount: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  assignmentNote: {
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.caption,
    fontStyle: "italic",
    marginTop: 4,
  },
  applicantsSection: {
    gap: setupTheme.spacing.compact,
  },
  applicantsHeaderRow: {
    paddingHorizontal: 4,
  },
  emptyApplicantsCard: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1.5,
    padding: setupTheme.spacing.section,
  },
  emptyApplicantsText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
  },
  applicantsList: {
    gap: setupTheme.spacing.compact,
  },
  applicantCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  applicantTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  applicantName: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
  applicantArea: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "600",
  },
  applicantStatusBadge: {
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusPending: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    color: setupTheme.color.foreground,
  },
  statusAccepted: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    color: setupTheme.color.ready,
  },
  statusRejected: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
    color: setupTheme.color.muted,
  },
  statusWithdrawn: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
    color: setupTheme.color.muted,
  },
  applicantMessageBox: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    padding: setupTheme.spacing.compact,
  },
  applicantMessageText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontStyle: "italic",
    lineHeight: 18,
  },
  selectWorkerButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    justifyContent: "center",
    marginTop: 4,
    paddingVertical: setupTheme.spacing.compact,
  },
  selectWorkerButtonText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.caption,
    fontWeight: "900",
  },
  actionCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.section,
    padding: setupTheme.spacing.section,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    justifyContent: "center",
    paddingVertical: setupTheme.spacing.section,
  },
  primaryActionText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
  dangerAction: {
    alignItems: "center",
    backgroundColor: setupTheme.color.dangerSurface,
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    justifyContent: "center",
    paddingVertical: setupTheme.spacing.section,
  },
  dangerActionText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
  terminalNotice: {
    alignItems: "center",
    paddingVertical: setupTheme.spacing.compact,
  },
  terminalText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    textAlign: "center",
  },
  disabledAction: {
    opacity: 0.6,
  },
});
