import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { AuthProfile } from "@/features/auth/model/auth-state";
import { gigGateway, type GigGateway } from "@/features/gigs/data/gig-gateway";
import {
  GIG_CATEGORY_LABELS,
  type GigRecord,
} from "@/features/gigs/model/gig-schemas";
import { setupTheme } from "@/features/setup/setupTheme";

import type { ShellMode } from "../model/shell-mode";
import { MarketplaceShell, marketplaceStyles } from "./MarketplaceShell";

type AuthenticatedHomeScreenProps = Readonly<{
  mode: ShellMode;
  profile: AuthProfile;
  gateway?: GigGateway;
}>;

const homeContent = {
  worker: {
    title: "Good work starts nearby.",
    subtitle:
      "Your worker space will collect live neighborhood and remote gigs as marketplace services come online.",
    emptyKicker: "OPEN NEAR YOU",
    emptyTitle: "No live gigs yet",
    emptyBody:
      "The hosted marketplace is connected, but live discovery arrives in the next workflow milestone.",
  },
  employer: {
    title: "Put useful work in motion.",
    subtitle:
      "Your employer space makes it clear what needs doing, who applied, and what happens next.",
    emptyKicker: "YOUR NOTICEBOARD",
    emptyTitle: "Post your first gig",
    emptyBody:
      "Post a task to find reliable neighbors for cleaning, errands, delivery, tutoring, or digital tasks.",
  },
} as const;

export function AuthenticatedHomeScreen({
  gateway = gigGateway,
  mode,
  profile,
}: AuthenticatedHomeScreenProps) {
  const router = useRouter();
  const copy = homeContent[mode];

  const [gigs, setGigs] = useState<GigRecord[]>([]);
  const [loadingGigs, setLoadingGigs] = useState(mode === "employer");

  useEffect(() => {
    if (mode !== "employer" || !profile.id) return;
    let mounted = true;

    gateway
      .listEmployerGigs(profile.id)
      .then((data) => {
        if (mounted) setGigs(data);
      })
      .catch(() => {
        if (mounted) setGigs([]);
      })
      .finally(() => {
        if (mounted) setLoadingGigs(false);
      });

    return () => {
      mounted = false;
    };
  }, [gateway, mode, profile.id]);

  return (
    <MarketplaceShell
      activeSection="home"
      subtitle={copy.subtitle}
      title={copy.title}
    >
      <View style={styles.welcomeStrip}>
        <Text style={styles.welcomeKicker}>SIGNED IN AS</Text>
        <Text style={styles.welcomeName}>{profile.displayName}</Text>
        <Text style={styles.welcomeArea}>
          {profile.homeArea ?? "Area not set"}
        </Text>
      </View>

      {mode === "employer" ? (
        <View style={styles.employerHeaderRow}>
          <Text style={styles.sectionHeader}>YOUR POSTED NOTICES</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(protected)/employer/gigs/new")}
            style={styles.newGigButton}
          >
            <Text style={styles.newGigButtonText}>+ Post a gig</Text>
          </Pressable>
        </View>
      ) : null}

      {mode === "employer" && loadingGigs ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={setupTheme.color.foreground} />
          <Text style={styles.loadingText}>Checking your notices...</Text>
        </View>
      ) : null}

      {mode === "employer" && !loadingGigs && gigs.length > 0 ? (
        <View style={styles.gigList}>
          {gigs.map((item) => (
            <Pressable
              accessibilityRole="button"
              key={item.id}
              onPress={() =>
                router.push(`/(protected)/employer/gigs/${item.id}`)
              }
              style={styles.gigCard}
            >
              <View style={styles.gigBadgeRow}>
                <Text style={styles.categoryBadge}>
                  {GIG_CATEGORY_LABELS[item.category] ?? item.category}
                </Text>
                <Text
                  style={[
                    styles.statusBadge,
                    item.status === "published"
                      ? styles.statusPublished
                      : item.status === "closed"
                        ? styles.statusClosed
                        : styles.statusDraft,
                  ]}
                >
                  {item.status.toUpperCase()}
                </Text>
              </View>

              <Text style={styles.gigTitle}>{item.title}</Text>

              <View style={styles.gigMetaRow}>
                <Text style={styles.gigBudget}>
                  PHP {item.budgetAmount.toLocaleString()}
                </Text>
                <Text style={styles.gigArea}>
                  {item.publicArea ?? item.workMode.toUpperCase()}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {mode === "worker" ||
      (mode === "employer" && !loadingGigs && gigs.length === 0) ? (
        <View style={marketplaceStyles.card}>
          <Text style={marketplaceStyles.cardKicker}>{copy.emptyKicker}</Text>
          <Text style={marketplaceStyles.cardTitle}>{copy.emptyTitle}</Text>
          <Text style={marketplaceStyles.body}>{copy.emptyBody}</Text>
          {mode === "employer" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(protected)/employer/gigs/new")}
              style={marketplaceStyles.primaryButton}
            >
              <Text style={marketplaceStyles.primaryButtonText}>
                Post a new gig
              </Text>
            </Pressable>
          ) : (
            <View
              accessibilityLabel={`${copy.emptyTitle} is not available yet`}
              accessibilityRole="summary"
              style={marketplaceStyles.mutedButton}
            >
              <Text style={marketplaceStyles.mutedButtonText}>Coming next</Text>
            </View>
          )}
        </View>
      ) : null}

      <View style={styles.safetyNote}>
        <Text style={styles.safetyKicker}>ONE ACCOUNT · TWO VIEWS</Text>
        <Text style={styles.safetyText}>
          Switching views changes navigation only. Database ownership and RLS
          still decide what this account may read or change.
        </Text>
      </View>
    </MarketplaceShell>
  );
}

const styles = StyleSheet.create({
  welcomeStrip: {
    backgroundColor: setupTheme.color.highlight,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.tight,
    padding: setupTheme.spacing.section,
  },
  welcomeKicker: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  welcomeName: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  welcomeArea: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  employerHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionHeader: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  newGigButton: {
    backgroundColor: setupTheme.color.highlight,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    paddingHorizontal: setupTheme.spacing.section,
    paddingVertical: setupTheme.spacing.compact,
  },
  newGigButtonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "900",
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    paddingVertical: setupTheme.spacing.compact,
  },
  loadingText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
  },
  gigList: {
    gap: setupTheme.spacing.compact,
  },
  gigCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  gigBadgeRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  categoryBadge: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    color: setupTheme.color.foreground,
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusBadge: {
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusDraft: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    color: setupTheme.color.foreground,
  },
  statusPublished: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    color: setupTheme.color.ready,
  },
  statusClosed: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.border,
    color: setupTheme.color.muted,
  },
  gigTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  gigMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gigBudget: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
  gigArea: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
  },
  safetyNote: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  safetyKicker: {
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  safetyText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 24,
  },
});
