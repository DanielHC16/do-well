import { StyleSheet, Text, View } from "react-native";

import type { AuthProfile } from "@/features/auth/model/auth-state";
import { setupTheme } from "@/features/setup/setupTheme";

import type { ShellMode } from "../model/shell-mode";
import { MarketplaceShell, marketplaceStyles } from "./MarketplaceShell";

type AuthenticatedHomeScreenProps = Readonly<{
  mode: ShellMode;
  profile: AuthProfile;
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
      "Your employer space will make it clear what needs doing, who applied, and what happens next.",
    emptyKicker: "YOUR NOTICEBOARD",
    emptyTitle: "Post a new gig",
    emptyBody:
      "Hosted gig creation is the next workflow milestone. This shell does not create placeholder records.",
  },
} as const;

export function AuthenticatedHomeScreen({
  mode,
  profile,
}: AuthenticatedHomeScreenProps) {
  const copy = homeContent[mode];
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

      <View style={marketplaceStyles.card}>
        <Text style={marketplaceStyles.cardKicker}>{copy.emptyKicker}</Text>
        <Text style={marketplaceStyles.cardTitle}>{copy.emptyTitle}</Text>
        <Text style={marketplaceStyles.body}>{copy.emptyBody}</Text>
        <View
          accessibilityLabel={`${copy.emptyTitle} is not available yet`}
          accessibilityRole="summary"
          style={marketplaceStyles.mutedButton}
        >
          <Text style={marketplaceStyles.mutedButtonText}>Coming next</Text>
        </View>
      </View>

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
