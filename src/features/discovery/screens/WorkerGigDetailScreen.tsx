import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

import {
  applicationGateway,
  type ApplicationGateway,
} from "@/features/applications/data/application-gateway";
import type { ApplicationRecord } from "@/features/applications/model/application-schemas";
import { GIG_CATEGORY_LABELS } from "@/features/gigs/model/gig-schemas";
import { setupTheme } from "@/features/setup/setupTheme";
import { AppButton, ProfileAvatar } from "@/shared/ui";

import {
  discoveryGateway,
  type DiscoveryGateway,
} from "../data/discovery-gateway";
import type { DiscoveryGigCard } from "../model/discovery-schemas";

type WorkerGigDetailScreenProps = Readonly<{
  gigId: string;
  userId?: string;
  gateway?: DiscoveryGateway;
  applications?: ApplicationGateway;
}>;

export function WorkerGigDetailScreen({
  applications = applicationGateway,
  gateway = discoveryGateway,
  gigId,
  userId,
}: WorkerGigDetailScreenProps) {
  const router = useRouter();
  const [gig, setGig] = useState<DiscoveryGigCard | null>(null);
  const [application, setApplication] = useState<ApplicationRecord | null>(
    null,
  );
  const [settledRequest, setSettledRequest] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const requestKey = `${userId ?? "unscoped"}:${gigId}:${reload}`;
  const busy = settledRequest !== requestKey;

  useEffect(() => {
    let mounted = true;

    Promise.all([
      gateway.getPublicGig(gigId, userId),
      applications.getWorkerApplicationForGig(gigId),
    ])
      .then(([gigData, appData]) => {
        if (mounted) {
          setGig(gigData);
          setApplication(appData);
          setErrorMessage(
            gigData ? null : "Notice not found or no longer available.",
          );
        }
      })
      .catch(() => {
        if (mounted) {
          setErrorMessage(
            "We couldn't load this gig or your application status. Check your connection and try again.",
          );
        }
      })
      .finally(() => {
        if (mounted) setSettledRequest(requestKey);
      });

    return () => {
      mounted = false;
    };
  }, [applications, gateway, gigId, reload, requestKey, userId]);

  async function handleApply() {
    if (gig?.status !== "published") return;
    setApplying(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const record = await applications.applyToGig({
        gigId,
        message: applyMessage.trim().length > 0 ? applyMessage.trim() : null,
      });
      setApplication(record);
      setActionSuccess("Your application was submitted successfully.");
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to submit your application.",
      );
    } finally {
      setApplying(false);
    }
  }

  async function handleWithdraw() {
    if (!application) return;
    setWithdrawing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const record = await applications.withdrawApplication(application.id);
      setApplication(record);
      setActionSuccess("Your application was withdrawn.");
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to withdraw your application.",
      );
    } finally {
      setWithdrawing(false);
    }
  }

  if (busy) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator color={setupTheme.color.foreground} />
        <Text style={styles.loadingText}>Loading notice...</Text>
      </SafeAreaView>
    );
  }

  if (errorMessage || !gig) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Notice unavailable</Text>
          <Text style={styles.errorText}>
            {errorMessage ?? "This gig notice is no longer published."}
          </Text>
          <AppButton
            label="Try again"
            onPress={() => setReload((value) => value + 1)}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/(protected)/worker")}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Return to noticeboard</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(protected)/worker")}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Noticeboard</Text>
        </Pressable>
        <Text style={styles.headerStatus}>
          STATUS: {gig.status.toUpperCase()}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
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

            <View style={styles.employerRow}>
              {gig.employerDisplayName ? (
                <ProfileAvatar name={gig.employerDisplayName} size={36} />
              ) : null}
              <View style={styles.employerIdentity}>
                <Text style={styles.sectionHeader}>Posted by</Text>
                <Text style={styles.descriptionText}>
                  {gig.employerDisplayName ?? "Employer profile unavailable"}
                </Text>
              </View>
            </View>

            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>Offered compensation</Text>
              <Text style={styles.budgetValue}>
                ₱{gig.budgetAmount.toLocaleString("en-PH")}
              </Text>
            </View>

            {gig.workMode === "onsite" || gig.workMode === "hybrid" ? (
              <View style={styles.areaSection}>
                <Text style={styles.areaHeader}>Neighborhood area</Text>
                <Text style={styles.areaValue}>
                  {gig.publicArea ?? "Locality specified by employer"}
                  {gig.distanceKm !== null
                    ? ` · ${gig.distanceKm} km away`
                    : ""}
                </Text>
                <Text style={styles.privacyNote}>
                  Keep exact addresses private; agree on meeting details with
                  the employer.
                </Text>
              </View>
            ) : (
              <View style={styles.areaSection}>
                <Text style={styles.areaHeader}>Work location</Text>
                <Text style={styles.areaValue}>
                  Remote (Work from anywhere)
                </Text>
              </View>
            )}

            {gig.reasons.length > 0 ? (
              <View style={styles.reasonsSection}>
                <Text style={styles.reasonsHeader}>Why this is relevant</Text>
                <View style={styles.reasonsList}>
                  {gig.reasons.map((reason) => (
                    <View key={reason} style={styles.reasonBadge}>
                      <Text style={styles.reasonText}>{reason}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
          <View style={styles.detailCard}>
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionHeader}>Work description</Text>
              <Text style={styles.descriptionText}>{gig.description}</Text>
            </View>

            {gig.applicationDeadline || gig.dueAt ? (
              <View style={styles.descriptionSection}>
                {gig.applicationDeadline ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.sectionHeader}>
                      Application deadline
                    </Text>
                    <Text style={styles.descriptionText}>
                      {formatGigDate(gig.applicationDeadline)}
                    </Text>
                  </View>
                ) : null}
                {gig.dueAt ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.sectionHeader}>Work due</Text>
                    <Text style={styles.descriptionText}>
                      {formatGigDate(gig.dueAt)}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.privacyNote}>Philippine time (UTC+8)</Text>
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
                    targetType: "gig",
                    targetId: gig.id,
                    targetTitle: gig.title,
                  },
                } as unknown as Parameters<typeof router.push>[0])
              }
              style={styles.reportNoticeButton}
            >
              <Text style={styles.reportNoticeText}>Report this notice</Text>
            </Pressable>
          </View>

          {actionSuccess ? (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>{actionSuccess}</Text>
            </View>
          ) : null}

          {actionError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Action failed</Text>
              <Text style={styles.errorText}>{actionError}</Text>
            </View>
          ) : null}

          <View style={styles.applyCard}>
            {application && application.status === "pending" ? (
              <>
                <View style={styles.appStatusRow}>
                  <Text style={styles.appStatusKicker}>Your application</Text>
                  <Text style={styles.statusPendingBadge}>Pending review</Text>
                </View>
                <Text style={styles.applyCardText}>
                  Your application is currently under review by the employer.
                  You will be notified once a selection is made.
                </Text>
                {application.message ? (
                  <View style={styles.submittedMessageBox}>
                    <Text style={styles.submittedMessageLabel}>
                      Your note to employer:
                    </Text>
                    <Text style={styles.submittedMessageText}>
                      {`"${application.message}"`}
                    </Text>
                  </View>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  disabled={withdrawing}
                  onPress={handleWithdraw}
                  style={[
                    styles.withdrawButton,
                    withdrawing && styles.disabledAction,
                  ]}
                >
                  {withdrawing ? (
                    <ActivityIndicator color={setupTheme.color.danger} />
                  ) : (
                    <Text style={styles.withdrawButtonText}>
                      Withdraw Application
                    </Text>
                  )}
                </Pressable>
              </>
            ) : application && application.status === "accepted" ? (
              <>
                <View style={styles.appStatusRow}>
                  <Text style={styles.appStatusKicker}>Your application</Text>
                  <Text style={styles.statusAcceptedBadge}>Accepted</Text>
                </View>
                <Text style={styles.acceptedMessage}>
                  Congratulations! The employer selected you for this
                  assignment.
                </Text>
              </>
            ) : application && application.status === "rejected" ? (
              <>
                <View style={styles.appStatusRow}>
                  <Text style={styles.appStatusKicker}>Your application</Text>
                  <Text style={styles.statusRejectedBadge}>Not selected</Text>
                </View>
                <Text style={styles.applyCardText}>
                  The employer selected another applicant for this gig. Explore
                  other active listings on the noticeboard!
                </Text>
              </>
            ) : gig.status !== "published" ? (
              <Text style={styles.applyCardText}>
                Applications are closed for this gig.
              </Text>
            ) : (
              <>
                <View style={styles.comingSoonStrip}>
                  <Text style={styles.comingSoonKicker}>
                    Apply for this gig
                  </Text>
                  {application?.status === "withdrawn" ? (
                    <Text style={styles.statusWithdrawnBadge}>
                      Previously withdrawn
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.applyCardText}>
                  Submit your qualifications or availability note directly to
                  the employer. Only the employer will see this.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Qualifications / availability note (optional)
                  </Text>
                  <TextInput
                    accessibilityLabel="Qualifications or availability note"
                    editable={!applying}
                    maxLength={1000}
                    multiline
                    numberOfLines={4}
                    onChangeText={setApplyMessage}
                    placeholder="e.g. I have 2 years of experience and can start tomorrow morning."
                    placeholderTextColor={setupTheme.color.muted}
                    style={styles.messageInput}
                    value={applyMessage}
                  />
                  <Text style={styles.counterText}>
                    {applyMessage.length} / 1000 characters
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Submit Application"
                  disabled={applying}
                  onPress={handleApply}
                  style={[
                    styles.primaryAction,
                    applying && styles.disabledAction,
                  ]}
                >
                  {applying ? (
                    <ActivityIndicator color={setupTheme.color.surface} />
                  ) : (
                    <Text style={styles.primaryActionText}>
                      Submit Application
                    </Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatGigDate(value: string): string {
  return new Date(value).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const styles = StyleSheet.create({
  detailCard: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderWidth: 1,
    borderRadius: setupTheme.radius.card,
    padding: setupTheme.spacing.section,
    gap: setupTheme.spacing.section,
  },
  employerRow: {
    flexWrap: "wrap",
    flexDirection: "row",
    alignItems: "center",
    gap: setupTheme.spacing.compact,
  },
  employerIdentity: { flex: 1, gap: setupTheme.spacing.tight },
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
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: setupTheme.spacing.section,
    paddingVertical: setupTheme.spacing.compact,
  },
  backButton: {
    minHeight: setupTheme.size.touchTarget,
    paddingVertical: setupTheme.spacing.compact,
  },
  backButtonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
  },
  headerStatus: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
  },
  content: {
    alignSelf: "center",
    maxWidth: setupTheme.size.contentMax,
    width: "100%",
    gap: setupTheme.spacing.section,
    padding: setupTheme.spacing.section,
    paddingBottom: setupTheme.spacing.generous,
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
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
  },
  mainCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.card,
    borderWidth: 1,
    gap: setupTheme.spacing.compact + setupTheme.spacing.tight,
    padding: setupTheme.spacing.section,
  },
  categoryRow: {
    flexWrap: "wrap",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  categoryBadge: {
    backgroundColor: setupTheme.color.accentSurface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.status,
    borderWidth: 0,
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.label,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modeBadge: {
    backgroundColor: setupTheme.color.background,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.status,
    borderWidth: 0,
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  title: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "600",
    lineHeight: 28,
  },
  budgetRow: {
    justifyContent: "space-between",
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: setupTheme.color.accentSurface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 0,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.compact + setupTheme.spacing.tight,
  },
  budgetLabel: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "600",
  },
  budgetValue: {
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.heading,
    fontWeight: "700",
  },
  areaSection: {
    gap: 4,
  },
  areaHeader: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
  },
  areaValue: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  privacyNote: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontStyle: "italic",
  },
  reasonsSection: {
    gap: setupTheme.spacing.compact,
  },
  reasonsHeader: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
  },
  reasonsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  reasonBadge: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reasonText: {
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.caption,
    fontWeight: "600",
  },
  descriptionSection: {
    borderTopColor: setupTheme.color.borderSoft,
    borderTopWidth: 0,
    gap: setupTheme.spacing.compact,
    paddingTop: 0,
  },
  reportNoticeButton: {
    alignSelf: "flex-start",
    marginTop: setupTheme.spacing.section,
    paddingVertical: setupTheme.spacing.tight,
  },
  reportNoticeText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    textDecorationLine: "underline",
  },
  sectionHeader: {
    lineHeight: 24,
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.section,
    fontWeight: "600",
  },
  descriptionText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
  },
  successBanner: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    padding: setupTheme.spacing.section,
  },
  successText: {
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
  },
  applyCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.card,
    borderWidth: 1,
    gap: setupTheme.spacing.compact + setupTheme.spacing.tight,
    padding: setupTheme.spacing.section,
  },
  comingSoonStrip: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  comingSoonKicker: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
  },
  comingSoonBadge: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  appStatusRow: {
    gap: setupTheme.spacing.compact,
    flexWrap: "wrap",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  appStatusKicker: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
  },
  statusPendingBadge: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusAcceptedBadge: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusRejectedBadge: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusWithdrawnBadge: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "600",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  applyCardText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
  },
  submittedMessageBox: {
    backgroundColor: setupTheme.color.background,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 0,
    gap: 4,
    padding: setupTheme.spacing.compact + setupTheme.spacing.tight,
  },
  submittedMessageLabel: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "600",
  },
  submittedMessageText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
    fontStyle: "italic",
  },
  acceptedMessage: {
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "600",
  },
  messageInput: {
    paddingVertical: setupTheme.spacing.compact,
    fontWeight: "400",
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    minHeight: 80,
    padding: setupTheme.spacing.compact,
    textAlignVertical: "top",
  },
  counterText: {
    alignSelf: "flex-end",
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
  },
  primaryAction: {
    paddingHorizontal: setupTheme.spacing.section,
    minHeight: setupTheme.size.button,
    borderColor: setupTheme.color.primary,
    alignItems: "center",
    backgroundColor: setupTheme.color.primary,
    borderRadius: setupTheme.radius.control,
    justifyContent: "center",
    paddingVertical: setupTheme.spacing.section,
  },
  primaryActionText: {
    textAlign: "center",
    color: setupTheme.color.onPrimary,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
  },
  withdrawButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.dangerSurface,
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    justifyContent: "center",
    paddingVertical: setupTheme.spacing.compact,
  },
  withdrawButtonText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
  },
  disabledAction: {
    opacity: 0.6,
  },
});
