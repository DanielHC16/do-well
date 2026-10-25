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
}>;

export function WorkerGigDetailScreen({
  gateway = discoveryGateway,
  gigId,
}: WorkerGigDetailScreenProps) {
  const router = useRouter();
  const [gig, setGig] = useState<DiscoveryGigCard | null>(null);
  const [busy, setBusy] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    gateway
      .getPublicGig(gigId)
      .then((data) => {
        if (mounted) {
          setGig(data);
          setErrorMessage(
            data ? null : "Notice not found or no longer available.",
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
  }, [gateway, gigId]);

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
            <Text style={styles.budgetKicker}>OFFERED COMPENSATION</Text>
            <Text style={styles.budgetAmount}>
              PHP {gig.budgetAmount.toLocaleString()}
            </Text>
          </View>

          {gig.publicArea ? (
            <View style={styles.areaRow}>
              <Text style={styles.areaLabel}>NEIGHBORHOOD AREA</Text>
              <Text style={styles.areaValue}>{gig.publicArea}</Text>
              <Text style={styles.privacyNote}>
                Exact address is provided once selected by the employer.
              </Text>
            </View>
          ) : (
            <View style={styles.areaRow}>
              <Text style={styles.areaLabel}>WORK LOCATION</Text>
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
        </View>

        <View style={styles.applyCard}>
          <View style={styles.comingSoonStrip}>
            <Text style={styles.comingSoonKicker}>APPLICATION DISPATCH</Text>
            <Text style={styles.comingSoonBadge}>COMING IN M07</Text>
          </View>
          <Text style={styles.applyCardText}>
            Worker applications with qualifications, availability notes, and
            employer selection will be activated in Milestone M07.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled
            style={[styles.primaryAction, styles.disabledAction]}
          >
            <Text style={styles.disabledActionText}>Apply for this Gig</Text>
          </Pressable>
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
    gap: 4,
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
  privacyNote: {
    color: setupTheme.color.muted,
    fontSize: 11,
    fontStyle: "italic",
  },
  reasonsSection: {
    gap: 6,
  },
  reasonsHeader: {
    color: setupTheme.color.muted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  reasonsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  reasonBadge: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reasonText: {
    color: setupTheme.color.foreground,
    fontSize: 11,
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
  applyCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  comingSoonStrip: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  comingSoonKicker: {
    color: setupTheme.color.accent,
    fontSize: 10,
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
  applyCardText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: 20,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: setupTheme.color.highlight,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 48,
  },
  disabledAction: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
  },
  disabledActionText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
});
