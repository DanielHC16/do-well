import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/shared/ui/Typography";

import type { AuthProfile } from "@/features/auth/model/auth-state";
import { setupTheme } from "@/features/setup/setupTheme";
import {
  MarketplaceShell,
  marketplaceStyles,
} from "@/features/shell/components/MarketplaceShell";
import { useShellMode } from "@/features/shell/context/useShellMode";
import type { ShellMode } from "@/features/shell/model/shell-mode";
import { ProfileAvatar } from "@/shared/ui";
import { AppIcon } from "@/shared/ui/AppIcon";

export type AccountCapabilities = Readonly<{
  isAdmin: boolean;
  preferredMode: ShellMode;
}>;

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
  const [preferredMode, setPreferredMode] = useState(
    capabilities.preferredMode,
  );
  const [savingMode, setSavingMode] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function chooseDefaultMode(nextMode: ShellMode) {
    if (nextMode === preferredMode || savingMode) return;
    setSavingMode(true);
    setMessage(null);
    setError(null);
    try {
      await onPersistPreferredMode(nextMode);
      setPreferredMode(nextMode);
      if (mode !== nextMode && !(await switchMode(nextMode))) {
        setError(
          "Default workspace saved, but this view couldn't switch. Try switching from the header.",
        );
        return;
      }
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
      subtitle="Your workspace preferences, privacy, and account."
      title="Account settings"
    >
      <View style={marketplaceStyles.card}>
        <View style={styles.identityRow}>
          <ProfileAvatar name={profile.displayName} size={40} />
          <View style={styles.identityCopy}>
            <Text style={marketplaceStyles.cardTitle}>
              {profile.displayName}
            </Text>
            <Text style={marketplaceStyles.body}>
              {profile.homeArea ?? "Public home area not set"}
            </Text>
          </View>
        </View>
        {capabilities.isAdmin ? (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>Platform administrator</Text>
          </View>
        ) : null}
      </View>

      <View style={marketplaceStyles.card}>
        <Text style={styles.sectionTitle}>Default workspace</Text>
        <Text style={marketplaceStyles.body}>
          Choose where Do Well opens. You can switch workspaces anytime.
        </Text>
        <View accessibilityRole="radiogroup" style={styles.optionList}>
          <WorkspaceOption
            busy={savingMode}
            description="Browse notices, apply for work, and manage assignments."
            label="Find work"
            onPress={() => void chooseDefaultMode("worker")}
            selected={preferredMode === "worker"}
          />
          <WorkspaceOption
            busy={savingMode}
            description="Post notices, choose workers, and review completed work."
            label="Offer work"
            onPress={() => void chooseDefaultMode("employer")}
            selected={preferredMode === "employer"}
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
          <AppIcon name="bell" size={20} color={setupTheme.color.primary} />
          <Text style={styles.summaryTitle}>Notifications</Text>
          <Text style={styles.summaryText}>
            Local activity alerts can be enabled from Activity.
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <AppIcon name="shield" size={20} color={setupTheme.color.primary} />
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
            Review marketplace reports and recent platform activity.
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

      <View style={marketplaceStyles.card}>
        <Text style={styles.sectionTitle}>Safety & reporting</Text>
        <Pressable
          accessibilityLabel="View my filed reports"
          accessibilityRole="button"
          onPress={() => router.push("/(protected)/reports")}
          style={styles.option}
        >
          <View style={styles.optionCopy}>
            <Text style={styles.optionTitle}>My filed reports</Text>
            <Text style={styles.optionDescription}>
              Track status of safety and guideline reports you submitted.
            </Text>
          </View>
        </Pressable>
      </View>

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
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: setupTheme.spacing.compact,
  },
  identityCopy: { flex: 1, gap: setupTheme.spacing.tight },
  adminBadge: {
    alignSelf: "flex-start",
    backgroundColor: setupTheme.color.accentSurface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.status,
    borderWidth: 0,
    paddingHorizontal: setupTheme.spacing.compact,
    paddingVertical: setupTheme.spacing.tight,
  },
  adminBadgeText: {
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.caption,
    fontWeight: "600",
  },
  sectionTitle: {
    lineHeight: 24,
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.section,
    fontWeight: "600",
  },
  optionList: { gap: setupTheme.spacing.compact },
  option: {
    alignItems: "center",
    backgroundColor: setupTheme.color.background,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    minHeight: 64,
    padding: setupTheme.spacing.compact + setupTheme.spacing.tight,
  },
  optionSelected: {
    backgroundColor: setupTheme.color.accentSurface,
    borderColor: setupTheme.color.secondary,
    borderWidth: 1,
  },
  radio: {
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    height: 20,
    width: 20,
  },
  radioSelected: {
    backgroundColor: setupTheme.color.primary,
    borderColor: setupTheme.color.accentSurface,
    borderWidth: 5,
  },
  optionCopy: { flex: 1, gap: setupTheme.spacing.tight },
  optionTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
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
  successText: { color: setupTheme.color.ready, fontWeight: "600" },
  errorText: { color: setupTheme.color.danger, fontWeight: "600" },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: setupTheme.spacing.compact,
  },
  summaryCard: {
    flex: 1,
    flexBasis: 150,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  summaryTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  summaryText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    lineHeight: 19,
  },
  adminCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.accentSurface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.card,
    borderWidth: 1,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  adminTitle: {
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.section,
    fontWeight: "600",
  },
  adminBody: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
  },
  signOutButton: {
    alignItems: "center",
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  signOutText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  disabled: { opacity: 0.5 },
});
