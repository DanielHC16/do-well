import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setupTheme } from "@/features/setup/setupTheme";
import { OfflineBanner } from "@/features/connectivity/components/OfflineBanner";
import { BrandLogo } from "@/shared/ui";
import { Text } from "@/shared/ui/Typography";
import { AppIcon, type AppIconName } from "@/shared/ui/AppIcon";

import { useShellMode } from "../context/useShellMode";
import type { ShellMode } from "../model/shell-mode";

type ShellSection = "home" | "work" | "activity" | "profile" | "account";

type MarketplaceShellProps = PropsWithChildren<
  Readonly<{
    activeSection: ShellSection;
    title: string;
    subtitle: string;
    scrollable?: boolean;
    listContent?: (heading: ReactNode) => ReactNode;
    dashboard?: boolean;
    compactHeader?: boolean;
    greeting?: string;
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
  scrollable = true,
  listContent,
  dashboard = false,
  compactHeader = false,
  greeting,
}: MarketplaceShellProps) {
  const router = useRouter();
  const { busy, error, mode, switchMode } = useShellMode();

  async function chooseMode(nextMode: ShellMode) {
    if (nextMode === mode) return;
    if (await switchMode(nextMode)) router.replace(modeRoute[nextMode]);
  }

  const heading = (
    <>
      {!dashboard ? (
        <View style={styles.heading}>
          {!compactHeader ? (
            <Text style={styles.eyebrow}>
              {mode === "worker" ? "FIND WORK" : "OFFER WORK"}
            </Text>
          ) : null}
          <Text
            accessibilityRole="header"
            style={[styles.title, compactHeader && styles.compactTitle]}
          >
            {title}
          </Text>
          {!compactHeader ? (
            <Text style={styles.subtitle}>{subtitle}</Text>
          ) : null}
        </View>
      ) : null}

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
              <AppIcon
                name={option === "worker" ? "search" : "briefcase"}
                size={20}
                color={
                  selected ? setupTheme.color.primary : setupTheme.color.primary
                }
              />
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
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <BrandLogo size={36} />
          <View style={styles.brandCopy}>
            <Text style={styles.wordmark}>Do Well</Text>
            {greeting ? <Text style={styles.greeting}>{greeting}</Text> : null}
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => router.push("/(protected)/activity")}
          style={styles.headerAction}
        >
          <AppIcon name="bell" size={20} />
        </Pressable>
      </View>
      <OfflineBanner />
      <KeyboardAvoidingView
        style={styles.bodyArea}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {scrollable ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.content,
              compactHeader && styles.compactContent,
            ]}
          >
            {heading}
            {children}
          </ScrollView>
        ) : listContent ? (
          <View style={styles.bodyArea}>
            {listContent(heading)}
            {children}
          </View>
        ) : (
          <View style={styles.bodyArea}>
            <View style={styles.fixedHeading}>{heading}</View>
            <View style={styles.bodyArea}>{children}</View>
          </View>
        )}
      </KeyboardAvoidingView>

      <View accessibilityRole="tablist" style={styles.navigation}>
        <ShellTab
          active={activeSection === "home"}
          label="Home"
          icon="home"
          onPress={() => router.replace(modeRoute[mode])}
        />
        <ShellTab
          active={activeSection === "work"}
          label="My Work"
          icon="briefcase"
          onPress={() => router.push("/(protected)/work")}
        />
        <ShellTab
          active={activeSection === "activity"}
          label="Activity"
          icon="bell"
          onPress={() => router.push("/(protected)/activity")}
        />
        <ShellTab
          active={activeSection === "profile" || activeSection === "account"}
          label="Profile"
          icon="user"
          onPress={() => router.push("/(protected)/profile")}
        />
      </View>
    </SafeAreaView>
  );
}

function ShellTab({
  active,
  label,
  icon,
  onPress,
}: Readonly<{
  active: boolean;
  label: string;
  icon: AppIconName;
  onPress: () => void;
}>) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.navItem, active ? styles.navItemActive : null]}
    >
      <AppIcon
        name={icon}
        size={20}
        color={active ? setupTheme.color.primary : setupTheme.color.muted}
      />
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
    borderWidth: 1,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  cardKicker: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  cardTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "700",
  },
  body: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: 24,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.primary,
    borderColor: setupTheme.color.primary,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: setupTheme.spacing.section,
  },
  primaryButtonText: {
    color: setupTheme.color.onPrimary,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
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
    fontWeight: "500",
  },
});

const styles = StyleSheet.create({
  greeting: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    lineHeight: 18,
  },
  headerAction: {
    width: setupTheme.size.touchTarget,
    height: setupTheme.size.touchTarget,
    borderRadius: setupTheme.radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  safeArea: { backgroundColor: setupTheme.color.background, flex: 1 },
  bodyArea: {
    flex: 1,
    width: "100%",
    maxWidth: setupTheme.size.contentMax,
    alignSelf: "center",
  },
  fixedHeading: {
    gap: setupTheme.spacing.section,
    paddingHorizontal: setupTheme.spacing.section,
    paddingBottom: setupTheme.spacing.compact,
  },
  topBar: {
    alignItems: "center",
    borderBottomColor: setupTheme.color.border,
    borderBottomWidth: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: setupTheme.spacing.section,
    paddingVertical: setupTheme.spacing.compact,
    width: "100%",
    maxWidth: setupTheme.size.contentMax,
    alignSelf: "center",
    gap: setupTheme.spacing.compact,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    flex: 1,
  },
  brandCopy: { flex: 1 },
  wordmark: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "700",
  },
  content: {
    gap: setupTheme.spacing.content,
    padding: setupTheme.spacing.section,
    paddingBottom: setupTheme.spacing.generous,
    width: "100%",
    maxWidth: setupTheme.size.contentMax,
    alignSelf: "center",
  },
  heading: { gap: setupTheme.spacing.compact },
  compactContent: { gap: setupTheme.spacing.compact },
  compactTitle: {
    fontSize: setupTheme.type.heading,
    lineHeight: setupTheme.type.heading * 1.3,
    letterSpacing: 0,
    fontWeight: "600",
  },
  eyebrow: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  title: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.title,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: setupTheme.type.title * 1.25,
  },
  subtitle: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: 24,
  },
  modeSwitcher: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    flexDirection: "row",
    gap: setupTheme.spacing.tight,
  },
  modeButton: {
    alignItems: "center",
    alignContent: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: setupTheme.spacing.compact,
    borderRadius: setupTheme.radius.control,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: setupTheme.spacing.compact,
  },
  modeButtonSelected: { backgroundColor: setupTheme.color.surface },
  modeButtonText: {
    flexShrink: 1,
    textAlign: "center",
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "500",
  },
  modeButtonTextSelected: {
    color: setupTheme.color.primary,
    fontWeight: "600",
  },
  errorPanel: {
    backgroundColor: setupTheme.color.dangerSurface,
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    gap: setupTheme.spacing.tight,
    padding: setupTheme.spacing.section,
  },
  errorTitle: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.label,
    fontWeight: "600",
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
    fontWeight: "500",
  },
  navigation: {
    backgroundColor: setupTheme.color.surface,
    borderTopColor: setupTheme.color.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    paddingHorizontal: setupTheme.spacing.compact,
    paddingVertical: setupTheme.spacing.tight,
    width: "100%",
    maxWidth: setupTheme.size.contentMax,
    alignSelf: "center",
  },
  navItem: {
    alignItems: "center",
    borderRadius: setupTheme.radius.control,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    gap: setupTheme.spacing.tight,
    paddingVertical: setupTheme.spacing.tight,
  },
  navItemActive: {
    backgroundColor: setupTheme.color.accentSurface,
  },
  navText: {
    textAlign: "center",
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "400",
  },
  navTextActive: { color: setupTheme.color.primary, fontWeight: "600" },
});
