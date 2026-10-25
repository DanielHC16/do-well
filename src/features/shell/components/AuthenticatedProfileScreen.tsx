import { Pressable, StyleSheet, Text, View } from "react-native";

import type { AuthProfile } from "@/features/auth/model/auth-state";
import { setupTheme } from "@/features/setup/setupTheme";

import { MarketplaceShell, marketplaceStyles } from "./MarketplaceShell";

type AuthenticatedProfileScreenProps = Readonly<{
  busy: boolean;
  profile: AuthProfile;
  onSignOut: () => Promise<void>;
}>;

export function AuthenticatedProfileScreen({
  busy,
  onSignOut,
  profile,
}: AuthenticatedProfileScreenProps) {
  return (
    <MarketplaceShell
      activeSection="profile"
      subtitle="This identity stays the same when you switch between finding and offering work."
      title="One account. Clear boundaries."
    >
      <View style={marketplaceStyles.card}>
        <Text style={marketplaceStyles.cardKicker}>YOUR PROFILE</Text>
        <Text style={marketplaceStyles.cardTitle}>{profile.displayName}</Text>
        <Text style={marketplaceStyles.body}>
          {profile.homeArea ?? "No home area is currently shown."}
        </Text>
      </View>

      <View style={styles.accountNote}>
        <Text style={styles.noteTitle}>ACCOUNT SECURITY</Text>
        <Text style={styles.noteText}>
          Worker and employer views never create a second identity or grant new
          database permissions.
        </Text>
      </View>

      <Pressable
        accessibilityLabel={busy ? "Signing out" : "Sign out"}
        accessibilityRole="button"
        accessibilityState={{ busy, disabled: busy }}
        disabled={busy}
        onPress={() => void onSignOut()}
        style={[styles.signOutButton, busy ? styles.disabled : null]}
      >
        <Text style={styles.signOutText}>
          {busy ? "Signing out..." : "Sign out"}
        </Text>
      </Pressable>
    </MarketplaceShell>
  );
}

const styles = StyleSheet.create({
  accountNote: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  noteTitle: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  noteText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 24,
  },
  signOutButton: {
    alignItems: "center",
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 52,
  },
  signOutText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
  disabled: { opacity: 0.5 },
});
