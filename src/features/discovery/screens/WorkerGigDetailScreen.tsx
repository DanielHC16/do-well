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

import {
  applicationGateway,
  type ApplicationGateway,
} from "@/features/applications/data/application-gateway";
import type { ApplicationRecord } from "@/features/applications/model/application-schemas";
import { GIG_CATEGORY_LABELS } from "@/features/gigs/model/gig-schemas";
import { setupTheme } from "@/features/setup/setupTheme";

import {
  discoveryGateway,
  type DiscoveryGateway,
} from "../data/discovery-gateway";
import type { DiscoveryGigCard } from "../model/discovery-schemas";

type WorkerGigDetailScreenProps = Readonly<{
  gigId: string;
  gateway?: DiscoveryGateway;
  applications?: ApplicationGateway;
}>;

export function WorkerGigDetailScreen({
  applications = applicationGateway,
  gateway = discoveryGateway,
  gigId,
}: WorkerGigDetailScreenProps) {
  const router = useRouter();
  const [gig, setGig] = useState<DiscoveryGigCard | null>(null);
  const [application, setApplication] = useState<ApplicationRecord | null>(
    null,
  );
  const [busy, setBusy] = useState(true);
  const [applying, setApplying] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      gateway.getPublicGig(gigId),
      applications.getWorkerApplicationForGig(gigId).catch(() => null),
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

  async function handleApply() {
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
          <Text style={styles.errorTitle}>NOTICE UNAVAILABLE</Text>
          <Text style={styles.errorText}>
            {errorMessage ?? "This gig notice is no longer published."}
          </Text>
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

      <ScrollView contentContainerStyle={styles.content}>
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
            <Text style={styles.budgetLabel}>OFFERED COMPENSATION</Text>
            <Text style={styles.budgetValue}>
              {gig.currency} {gig.budgetAmount.toLocaleString("en-US")}
            </Text>
          </View>

          {gig.workMode === "onsite" || gig.workMode === "hybrid" ? (
            <View style={styles.areaSection}>
              <Text style={styles.areaHeader}>NEIGHBORHOOD AREA</Text>
              <Text style={styles.areaValue}>
                {gig.publicArea ?? "Locality specified by employer"}
                {gig.distanceKm !== null ? ` · ${gig.distanceKm} km away` : ""}
              </Text>
              <Text style={styles.privacyNote}>
                Exact address is provided once selected by the employer.
              </Text>
            </View>
          ) : (
            <View style={styles.areaSection}>
              <Text style={styles.areaHeader}>WORK LOCATION</Text>
              <Text style={styles.areaValue}>Remote (Work from anywhere)</Text>
            </View>
          )}

          {gig.reasons.length > 0 ? (
            <View style={styles.reasonsSection}>
              <Text style={styles.reasonsHeader}>WHY THIS IS RELEVANT</Text>
              <View style={styles.reasonsList}>
                {gig.reasons.map((reason) => (
                  <View key={reason} style={styles.reasonBadge}>
                    <Text style={styles.reasonText}>{reason}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.descriptionSection}>
            <Text style={styles.sectionHeader}>WORK DESCRIPTION</Text>
            <Text style={styles.descriptionText}>{gig.description}</Text>
          </View>

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
            <Text style={styles.errorTitle}>ACTION FAILED</Text>
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        ) : null}

        <View style={styles.applyCard}>
          {application && application.status === "pending" ? (
            <>
              <View style={styles.appStatusRow}>
                <Text style={styles.appStatusKicker}>YOUR APPLICATION</Text>
                <Text style={styles.statusPendingBadge}>PENDING REVIEW</Text>
              </View>
              <Text style={styles.applyCardText}>
                Your application is currently under review by the employer. You
                will be notified once a selection is made.
              </Text>
              {application.message ? (
                <View style={styles.submittedMessageBox}>
                  <Text style={styles.submittedMessageLabel}>
                    YOUR NOTE TO EMPLOYER:
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
                <Text style={styles.appStatusKicker}>YOUR APPLICATION</Text>
                <Text style={styles.statusAcceptedBadge}>ACCEPTED</Text>
              </View>
              <Text style={styles.acceptedMessage}>
                Congratulations! The employer selected you for this assignment.
              </Text>
            </>
          ) : application && application.status === "rejected" ? (
            <>
              <View style={styles.appStatusRow}>
                <Text style={styles.appStatusKicker}>YOUR APPLICATION</Text>
                <Text style={styles.statusRejectedBadge}>NOT SELECTED</Text>
              </View>
              <Text style={styles.applyCardText}>
                The employer selected another applicant for this gig. Explore
                other active listings on the noticeboard!
              </Text>
            </>
          ) : (
            <>
              <View style={styles.comingSoonStrip}>
                <Text style={styles.comingSoonKicker}>APPLY FOR THIS GIG</Text>
                {application?.status === "withdrawn" ? (
                  <Text style={styles.statusWithdrawnBadge}>
                    PREVIOUSLY WITHDRAWN
                  </Text>
                ) : null}
              </View>
              <Text style={styles.applyCardText}>
                Submit your qualifications or availability note directly to the
                employer. Only the employer will see this.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  QUALIFICATIONS / AVAILABILITY NOTE (OPTIONAL)
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
    gap: setupTheme.spacing.section,
    padding: setupTheme.spacing.section,
  },
  categoryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  categoryBadge: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
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
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  budgetRow: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1.5,
    gap: 4,
    padding: setupTheme.spacing.compact,
  },
  budgetLabel: {
    color: setupTheme.color.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  budgetValue: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  areaSection: {
    gap: 4,
  },
  areaHeader: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
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
    fontWeight: "900",
    letterSpacing: 0.8,
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
    fontSize: 11,
    fontWeight: "800",
  },
  descriptionSection: {
    borderTopColor: setupTheme.color.borderSoft,
    borderTopWidth: 1,
    gap: setupTheme.spacing.compact,
    paddingTop: setupTheme.spacing.section,
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
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
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
    borderWidth: 1.5,
    padding: setupTheme.spacing.section,
  },
  successText: {
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
  applyCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.section,
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
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  comingSoonBadge: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    color: setupTheme.color.foreground,
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  appStatusRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  appStatusKicker: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  statusPendingBadge: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1.5,
    color: setupTheme.color.foreground,
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusAcceptedBadge: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1.5,
    color: setupTheme.color.ready,
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusRejectedBadge: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    color: setupTheme.color.muted,
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusWithdrawnBadge: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    color: setupTheme.color.muted,
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  applyCardText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    lineHeight: 18,
  },
  submittedMessageBox: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    gap: 4,
    padding: setupTheme.spacing.compact,
  },
  submittedMessageLabel: {
    color: setupTheme.color.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  submittedMessageText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontStyle: "italic",
  },
  acceptedMessage: {
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "800",
  },
  messageInput: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1.5,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    minHeight: 80,
    padding: setupTheme.spacing.compact,
    textAlignVertical: "top",
  },
  counterText: {
    alignSelf: "flex-end",
    color: setupTheme.color.muted,
    fontSize: 11,
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
  withdrawButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.dangerSurface,
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1.5,
    justifyContent: "center",
    paddingVertical: setupTheme.spacing.compact,
  },
  withdrawButtonText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
  disabledAction: {
    opacity: 0.6,
  },
});
