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

import { gigGateway, type GigGateway } from "../data/gig-gateway";
import { GIG_CATEGORY_LABELS, type GigRecord } from "../model/gig-schemas";

type EmployerGigDetailScreenProps = Readonly<{
  gigId: string;
  gateway?: GigGateway;
}>;

export function EmployerGigDetailScreen({
  gateway = gigGateway,
  gigId,
}: EmployerGigDetailScreenProps) {
  const router = useRouter();
  const [gig, setGig] = useState<GigRecord | null>(null);
  const [busy, setBusy] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    gateway
      .getGigById(gigId)
      .then((data) => {
        if (mounted) {
          setGig(data);
          setErrorMessage(null);
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
  }, [gateway, gigId]);

  async function handlePublish() {
    setActionBusy(true);
    setErrorMessage(null);
    try {
      const updated = await gateway.publishGig(gigId);
      setGig(updated);
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
    try {
      const updated = await gateway.closeGig(gigId);
      setGig(updated);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to close gig.",
      );
    } finally {
      setActionBusy(false);
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
        {errorMessage ? (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
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

        <View style={styles.actionCard}>
          {gig.status === "draft" ? (
            <Pressable
              accessibilityRole="button"
              disabled={actionBusy}
              onPress={() => void handlePublish()}
              style={styles.primaryAction}
            >
              {actionBusy ? (
                <ActivityIndicator color={setupTheme.color.foreground} />
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
  errorBanner: {
    backgroundColor: setupTheme.color.dangerSurface,
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    padding: setupTheme.spacing.compact,
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
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
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
    backgroundColor: setupTheme.color.highlight,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    padding: setupTheme.spacing.compact,
  },
  budgetKicker: {
    color: setupTheme.color.accent,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  budgetAmount: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  areaRow: {
    gap: 2,
  },
  areaLabel: {
    color: setupTheme.color.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
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
    paddingTop: setupTheme.spacing.compact,
  },
  sectionHeader: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  descriptionText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 24,
  },
  actionCard: {
    gap: setupTheme.spacing.compact,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: setupTheme.color.highlight,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 52,
  },
  primaryActionText: {
    color: setupTheme.color.foreground,
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
    minHeight: 52,
  },
  dangerActionText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
  terminalNotice: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    padding: setupTheme.spacing.section,
  },
  terminalText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    textAlign: "center",
  },
});
