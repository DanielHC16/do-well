import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { AuthProfile } from "@/features/auth/model/auth-state";
import { setupTheme } from "@/features/setup/setupTheme";
import {
  MarketplaceShell,
  marketplaceStyles,
} from "@/features/shell/components/MarketplaceShell";
import { useShellMode } from "@/features/shell/context/useShellMode";
import type { ShellMode } from "@/features/shell/model/shell-mode";

export type AccountCapabilities = Readonly<{ isAdmin: boolean }>;

type AccountSettingsScreenProps = Readonly<{
  capabilities: AccountCapabilities;
  profile: AuthProfile;
  onPersistPreferredMode: (mode: ShellMode) => Promise<void>;
  onSignOut: () => Promise<void>;
}>;

export function AccountSettingsScreen({
  capabilities,
  onPersistPreferredMode,
  onSignOut,
  profile,
}: AccountSettingsScreenProps) {
  const router = useRouter();
  const { mode, switchMode } = useShellMode();
  const [savingMode, setSavingMode] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function chooseDefaultMode(nextMode: ShellMode) {
    if (nextMode === mode || savingMode) return;
    setSavingMode(true);
    setMessage(null);
    setError(null);
    try {
      await onPersistPreferredMode(nextMode);
      await switchMode(nextMode);
      setMessage("Default workspace updated.");
    } catch {
      setError("We couldn't update your default workspace. Try again.");
    } finally {
      setSavingMode(false);
    }
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <MarketplaceShell
      activeSection="profile"
      subtitle="Manage how you work, what the app can access, and the account signed in on this device."
      title="Account settings"
    >
      <View style={marketplaceStyles.card}>
        <Text style={marketplaceStyles.cardKicker}>SIGNED-IN IDENTITY</Text>
        <Text style={marketplaceStyles.cardTitle}>{profile.displayName}</Text>
        <Text style={marketplaceStyles.body}>
          {profile.homeArea ?? "Public home area not set"}
        </Text>
        {capabilities.isAdmin ? (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>Platform administrator</Text>
          </View>
        ) : null}
      </View>

      <View style={marketplaceStyles.card}>
        <Text style={styles.sectionTitle}>Default workspace</Text>
        <Text style={marketplaceStyles.body}>
          Choose where DO-WELL opens. You can still use both sides of the
          marketplace at any time.
        </Text>
        <View accessibilityRole="radiogroup" style={styles.optionList}>
          <WorkspaceOption
            busy={savingMode}
            description="Browse notices, apply for work, and manage assignments."
            label="Find work"
            onPress={() => void chooseDefaultMode("worker")}
            selected={mode === "worker"}
          />
          <WorkspaceOption
            busy={savingMode}
            description="Post notices, choose workers, and review completed work."
            label="Offer work"
            onPress={() => void chooseDefaultMode("employer")}
            selected={mode === "employer"}
          />
        </View>
        {savingMode ? (
          <View accessibilityLiveRegion="polite" style={styles.statusRow}>
            <ActivityIndicator color={setupTheme.color.foreground} />
            <Text style={styles.statusText}>
              Saving workspace preference...
            </Text>
          </View>
        ) : null}
        {message ? (
          <Text accessibilityLiveRegion="polite" style={styles.successText}>
            {message}
          </Text>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {error}
          </Text>
        ) : null}
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Notifications</Text>
          <Text style={styles.summaryText}>
            Local activity alerts can be enabled from Activity.
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Location & privacy</Text>
          <Text style={styles.summaryText}>
            Location is requested only while finding nearby work. Exact
            addresses stay private.
          </Text>
        </View>
      </View>

      {capabilities.isAdmin ? (
        <View style={styles.adminCard}>
          <Text style={styles.adminTitle}>Admin Console</Text>
          <Text style={styles.adminBody}>
            Review marketplace reports and see operational activity protected by
            server authorization.
          </Text>
          <Pressable
            accessibilityLabel="Open Admin Console"
            accessibilityRole="button"
            onPress={() => router.push("/(protected)/admin")}
            style={marketplaceStyles.primaryButton}
          >
            <Text style={marketplaceStyles.primaryButtonText}>
              Open Admin Console
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        accessibilityLabel={signingOut ? "Signing out" : "Sign out"}
        accessibilityRole="button"
        accessibilityState={{ busy: signingOut, disabled: signingOut }}
        disabled={signingOut}
        onPress={() => void signOut()}
        style={[styles.signOutButton, signingOut && styles.disabled]}
      >
        <Text style={styles.signOutText}>
          {signingOut ? "Signing out..." : "Sign out"}
        </Text>
      </Pressable>
    </MarketplaceShell>
  );
}

function WorkspaceOption({
  busy,
  description,
  label,
  onPress,
  selected,
}: Readonly<{
  busy: boolean;
  description: string;
  label: "Find work" | "Offer work";
  onPress: () => void;
  selected: boolean;
}>) {
  return (
    <Pressable
      accessibilityLabel={`Use ${label} by default`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: busy, selected }}
      disabled={busy}
      onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]} />
      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle}>{label}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  adminBadge: {
    alignSelf: "flex-start",
    backgroundColor: setupTheme.color.highlight,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    paddingHorizontal: setupTheme.spacing.compact,
    paddingVertical: setupTheme.spacing.tight,
  },
  adminBadgeText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "900",
  },
  sectionTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  optionList: { gap: setupTheme.spacing.compact },
  option: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    minHeight: 64,
    padding: setupTheme.spacing.compact,
  },
  optionSelected: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    borderWidth: 2,
  },
  radio: {
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.status,
    borderWidth: 2,
    height: 20,
    width: 20,
  },
  radioSelected: {
    backgroundColor: setupTheme.color.foreground,
    borderColor: setupTheme.color.highlight,
    borderWidth: 5,
  },
  optionCopy: { flex: 1, gap: setupTheme.spacing.tight },
  optionTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
  optionDescription: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    lineHeight: 18,
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
  },
  statusText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
  },
  successText: { color: setupTheme.color.ready, fontWeight: "800" },
  errorText: { color: setupTheme.color.danger, fontWeight: "800" },
  summaryGrid: { gap: setupTheme.spacing.compact },
  summaryCard: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    gap: setupTheme.spacing.tight,
    padding: setupTheme.spacing.section,
  },
  summaryTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
  summaryText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    lineHeight: 19,
  },
  adminCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.foreground,
    borderColor: setupTheme.color.highlight,
    borderRadius: setupTheme.radius.card,
    borderWidth: 3,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  adminTitle: {
    color: setupTheme.color.highlight,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  adminBody: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
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
