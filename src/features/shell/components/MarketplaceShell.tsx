import { useRouter } from "expo-router";
import type { PropsWithChildren } from "react";
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
import { OfflineBanner } from "@/features/connectivity/components/OfflineBanner";

import { useShellMode } from "../context/useShellMode";
import type { ShellMode } from "../model/shell-mode";

type ShellSection = "home" | "activity" | "profile";

type MarketplaceShellProps = PropsWithChildren<
  Readonly<{
    activeSection: ShellSection;
    title: string;
    subtitle: string;
  }>
>;

const modeRoute = {
  worker: "/(protected)/worker",
  employer: "/(protected)/employer",
} as const;

export function MarketplaceShell({
  activeSection,
  children,
  subtitle,
  title,
}: MarketplaceShellProps) {
  const router = useRouter();
  const { busy, error, mode, switchMode } = useShellMode();

  async function chooseMode(nextMode: ShellMode) {
    if (nextMode === mode) return;
    if (await switchMode(nextMode)) router.replace(modeRoute[nextMode]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Text accessibilityLabel="Do Well" style={styles.wordmark}>
            DO / WELL
          </Text>
          <View style={styles.brandRule} />
          <Text style={styles.brandNote}>NEIGHBORHOOD WORK</Text>
        </View>
        <Text style={styles.liveLabel}>LIVE WORKSPACE</Text>
      </View>
      <OfflineBanner />
      <View style={{ display: "none" }}></View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>
            {mode === "worker" ? "WORKER VIEW" : "EMPLOYER VIEW"}
          </Text>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View accessibilityRole="radiogroup" style={styles.modeSwitcher}>
          {(["worker", "employer"] as const).map((option) => {
            const selected = mode === option;
            const label =
              option === "worker"
                ? "Show worker workspace"
                : "Show employer workspace";
            return (
              <Pressable
                accessibilityLabel={label}
                accessibilityRole="radio"
                accessibilityState={{
                  checked: selected,
                  disabled: busy || selected,
                  selected,
                }}
                disabled={busy || selected}
                key={option}
                onPress={() => void chooseMode(option)}
                style={[
                  styles.modeButton,
                  selected ? styles.modeButtonSelected : null,
                ]}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    selected ? styles.modeButtonTextSelected : null,
                  ]}
                >
                  {option === "worker" ? "Find work" : "Offer work"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <View accessibilityRole="alert" style={styles.errorPanel}>
            <Text style={styles.errorTitle}>VIEW NOT SAVED</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {busy ? (
          <View accessibilityLiveRegion="polite" style={styles.busyRow}>
            <ActivityIndicator color={setupTheme.color.foreground} />
            <Text style={styles.busyText}>Saving your view...</Text>
          </View>
        ) : null}

        {children}
      </ScrollView>

      <View accessibilityRole="tablist" style={styles.navigation}>
        <ShellTab
          active={activeSection === "home"}
          label="Home"
          onPress={() => router.replace(modeRoute[mode])}
        />
        <ShellTab
          active={activeSection === "activity"}
          label="Activity"
          onPress={() => router.push("/(protected)/activity")}
        />
        <ShellTab
          active={activeSection === "profile"}
          label="Profile"
          onPress={() => router.push("/(protected)/profile")}
        />
      </View>
    </SafeAreaView>
  );
}

function ShellTab({
  active,
  label,
  onPress,
}: Readonly<{ active: boolean; label: string; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.navItem, active ? styles.navItemActive : null]}
    >
      <Text style={[styles.navText, active ? styles.navTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export const marketplaceStyles = StyleSheet.create({
  card: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  cardKicker: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  cardTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  body: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: 24,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.highlight,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: setupTheme.spacing.section,
  },
  primaryButtonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
  mutedButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: setupTheme.spacing.section,
  },
  mutedButtonText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
});

const styles = StyleSheet.create({
  safeArea: { backgroundColor: setupTheme.color.background, flex: 1 },
  topBar: {
    alignItems: "center",
    borderBottomColor: setupTheme.color.border,
    borderBottomWidth: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: setupTheme.spacing.section,
    paddingVertical: setupTheme.spacing.compact,
  },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  wordmark: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  brandRule: { backgroundColor: setupTheme.color.accent, height: 4, width: 24 },
  brandNote: {
    color: setupTheme.color.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  liveLabel: {
    color: setupTheme.color.ready,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  content: {
    gap: setupTheme.spacing.content,
    padding: setupTheme.spacing.section,
    paddingBottom: setupTheme.spacing.generous,
  },
  heading: { gap: setupTheme.spacing.compact },
  eyebrow: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  title: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.title,
    fontWeight: "900",
    letterSpacing: -1,
    lineHeight: 40,
  },
  subtitle: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: 24,
  },
  modeSwitcher: {
    backgroundColor: setupTheme.color.highlight,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.compact,
  },
  modeButton: {
    alignItems: "center",
    borderRadius: setupTheme.radius.control,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: setupTheme.spacing.compact,
  },
  modeButtonSelected: { backgroundColor: setupTheme.color.foreground },
  modeButtonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
  modeButtonTextSelected: { color: setupTheme.color.surface },
  errorPanel: {
    backgroundColor: setupTheme.color.dangerSurface,
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    gap: setupTheme.spacing.tight,
    padding: setupTheme.spacing.section,
  },
  errorTitle: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
  },
  errorText: { color: setupTheme.color.danger, fontSize: setupTheme.type.body },
  busyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
  },
  busyText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
  },
  navigation: {
    backgroundColor: setupTheme.color.surface,
    borderTopColor: setupTheme.color.border,
    borderTopWidth: 2,
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.compact,
  },
  navItem: {
    alignItems: "center",
    borderRadius: setupTheme.radius.small,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  navItemActive: { backgroundColor: setupTheme.color.foreground },
  navText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "800",
  },
  navTextActive: { color: setupTheme.color.surface },
});
