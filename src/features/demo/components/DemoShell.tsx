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

type DemoShellProps = PropsWithChildren<
  Readonly<{
    title: string;
    subtitle?: string;
    busy?: boolean;
    error?: string | null;
    onRetry?: () => void;
  }>
>;

export function DemoShell({
  busy = false,
  children,
  error,
  onRetry,
  subtitle,
  title,
}: DemoShellProps) {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.navigation}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Home"
          onPress={() => router.replace("/(demo)")}
          style={styles.navButton}
        >
          <Text style={styles.navText}>DO / WELL</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => router.push("/(demo)/settings")}
          style={styles.navButton}
        >
          <Text style={styles.navText}>Settings</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {error ? (
          <View accessibilityRole="alert" style={styles.errorPanel}>
            <Text style={styles.errorKicker}>SOMETHING NEEDS ATTENTION</Text>
            <Text style={styles.errorText}>{error}</Text>
            {onRetry ? (
              <Pressable
                accessibilityRole="button"
                onPress={onRetry}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {busy ? (
          <View
            accessibilityLabel="Saving changes"
            accessibilityLiveRegion="polite"
            style={styles.busy}
          >
            <ActivityIndicator color={setupTheme.color.foreground} />
            <Text style={styles.busyText}>Saving changes...</Text>
          </View>
        ) : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export const demoStyles = StyleSheet.create({
  card: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  button: {
    alignItems: "center",
    backgroundColor: setupTheme.color.foreground,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: setupTheme.spacing.section,
    paddingVertical: setupTheme.spacing.compact,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.highlight,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: setupTheme.spacing.section,
    paddingVertical: setupTheme.spacing.compact,
  },
  secondaryButtonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
  sectionTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  mutedText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: 24,
  },
  field: { gap: setupTheme.spacing.compact },
  label: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    minHeight: 52,
    paddingHorizontal: setupTheme.spacing.section,
    paddingVertical: setupTheme.spacing.compact,
  },
  inputError: { borderColor: setupTheme.color.danger },
  errorText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.5,
    overflow: "hidden",
    paddingHorizontal: setupTheme.spacing.compact,
    paddingVertical: setupTheme.spacing.tight,
    textTransform: "uppercase",
  },
});

const styles = StyleSheet.create({
  navigation: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: setupTheme.color.foreground,
    paddingHorizontal: setupTheme.spacing.section,
  },
  navButton: {
    minHeight: setupTheme.size.touchTarget,
    justifyContent: "center",
    paddingHorizontal: setupTheme.spacing.compact,
  },
  navText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
  safeArea: { backgroundColor: setupTheme.color.background, flex: 1 },
  content: {
    gap: setupTheme.spacing.content,
    padding: setupTheme.spacing.section,
    paddingBottom: 64,
  },
  heading: { gap: setupTheme.spacing.compact },
  title: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.title,
    fontWeight: "900",
    letterSpacing: -1.2,
    lineHeight: 38,
  },
  subtitle: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: 24,
    maxWidth: 520,
  },
  errorPanel: {
    backgroundColor: setupTheme.color.dangerSurface,
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  errorKicker: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  errorText: { color: setupTheme.color.danger, fontSize: setupTheme.type.body },
  retryButton: {
    alignSelf: "flex-start",
    paddingVertical: setupTheme.spacing.compact,
  },
  retryText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
  busy: {
    alignItems: "center",
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.compact,
  },
  busyText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
  },
});
