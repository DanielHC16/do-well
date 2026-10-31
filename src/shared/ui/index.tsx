import { Text, TextInput } from "@/shared/ui/Typography";
import { useState, type PropsWithChildren } from "react";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type TextInputProps,
  type TextProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setupTheme as theme } from "./theme";
import { AppIcon, type AppIconName } from "./AppIcon";

export { setupTheme } from "./theme";
export { AppIcon, type AppIconName } from "./AppIcon";

export function BrandLogo({
  size = theme.size.brand,
}: Readonly<{ size?: number }>) {
  return (
    <Image
      accessible
      accessibilityLabel="Do Well logo"
      accessibilityRole="image"
      source={require("../../../branding/do-well-app-logo.png")}
      contentFit="contain"
      style={{
        width: size,
        height: size,
        backgroundColor: theme.color.surface,
        borderRadius: size / 2,
      }}
    />
  );
}

export function AppText({
  variant = "body",
  tone = "default",
  style,
  ...props
}: TextProps & {
  variant?: "body" | "caption" | "title" | "heading" | "cardTitle";
  tone?: "default" | "muted";
}) {
  return (
    <Text
      {...props}
      style={[
        styles.text,
        {
          fontSize: theme.type[variant],
          lineHeight: theme.type[variant] * 1.5,
          color: tone === "muted" ? theme.color.muted : theme.color.foreground,
        },
        variant !== "body" && variant !== "caption" && styles.bold,
        style,
      ]}
    />
  );
}

export function AppButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  accessibilityLabel,
  icon,
}: Readonly<{
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  accessibilityLabel?: string;
  icon?: AppIconName;
}>) {
  const blocked = loading || disabled;
  const foreground =
    variant === "primary"
      ? theme.color.onPrimary
      : variant === "danger"
        ? theme.color.danger
        : theme.color.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary"
          ? styles.primary
          : variant === "danger"
            ? styles.danger
            : styles.secondary,
        (blocked || pressed) && styles.dimmed,
      ]}
    >
      {loading ? <ActivityIndicator color={foreground} /> : null}
      {icon && !loading ? <AppIcon name={icon} color={foreground} /> : null}
      <Text style={[styles.buttonText, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

export function AppInput({
  label,
  error,
  style,
  leadingIcon,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
  leadingIcon?: AppIconName;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={
          leadingIcon
            ? [
                styles.inputRow,
                focused ? styles.inputFocused : null,
                error ? styles.inputError : null,
              ]
            : undefined
        }
      >
        {leadingIcon ? (
          <AppIcon name={leadingIcon} color={theme.color.muted} />
        ) : null}
        <TextInput
          {...props}
          accessibilityLabel={props.accessibilityLabel ?? label}
          placeholderTextColor={theme.color.muted}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          style={[
            styles.input,
            focused ? styles.inputFocused : null,
            error ? styles.inputError : null,
            style,
            leadingIcon ? styles.inputWithIcon : null,
          ]}
        />
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function ProfileAvatar({
  name,
  size = theme.size.avatar,
}: Readonly<{ name: string; size?: number }>) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
  return (
    <View
      accessibilityLabel={`${name}'s avatar`}
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={styles.avatarText}>{initials || "DW"}</Text>
    </View>
  );
}

export function StatusBadge({
  label,
  tone = "neutral",
}: Readonly<{ label: string; tone?: "neutral" | "success" | "danger" }>) {
  return (
    <View
      style={[
        styles.badge,
        tone === "success"
          ? styles.successSurface
          : tone === "danger"
            ? styles.danger
            : styles.secondary,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          tone === "success"
            ? styles.successText
            : tone === "danger"
              ? styles.errorText
              : null,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function FilterChip({
  label,
  selected,
  onPress,
  icon,
}: Readonly<{
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: AppIconName;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon ? (
        <AppIcon
          name={icon}
          size={16}
          color={selected ? theme.color.secondary : theme.color.muted}
        />
      ) : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SectionHeader({
  title,
  description,
}: Readonly<{ title: string; description?: string }>) {
  return (
    <View style={styles.field}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {description ? <Text style={styles.muted}>{description}</Text> : null}
    </View>
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  kind = "discovery",
}: Readonly<{
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  kind?: "discovery" | "employer" | "work" | "activity";
}>) {
  return (
    <View style={styles.state}>
      <View style={styles.emptyIntro}>
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.emptyArtwork}
        >
          <View style={styles.artworkBack} />
          <View style={styles.artworkPaper}>
            <AppIcon
              name={
                kind === "employer"
                  ? "plus"
                  : kind === "work"
                    ? "briefcase"
                    : kind === "activity"
                      ? "bell"
                      : "search"
              }
              size={24}
            />
            <View style={styles.artworkLine} />
            <View style={[styles.artworkLine, styles.artworkShort]} />
          </View>
          <View style={styles.artworkDot} />
        </View>
        <View style={styles.emptyCopy}>
          <Text accessibilityRole="header" style={styles.emptyTitle}>
            {title}
          </Text>
          <Text style={styles.emptyMessage}>{message}</Text>
        </View>
      </View>
      {actionLabel && onAction ? (
        <View style={styles.stateAction}>
          <AppButton
            label={actionLabel}
            onPress={onAction}
            variant="secondary"
            icon="arrowRight"
          />
        </View>
      ) : null}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: Readonly<{ message: string; onRetry?: () => void }>) {
  return (
    <View style={[styles.state, styles.danger]}>
      <View style={styles.stateHeading}>
        <AppIcon name="help" color={theme.color.danger} size={20} />
        <Text
          accessibilityRole="alert"
          style={[styles.errorText, styles.stateMessage]}
        >
          {message}
        </Text>
      </View>
      {onRetry ? (
        <View style={styles.stateAction}>
          <AppButton label="Try again" onPress={onRetry} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

export function LoadingSkeleton({
  label = "Loading…",
}: Readonly<{ label?: string }>) {
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
      style={styles.state}
    >
      <View style={styles.stateHeading}>
        <ActivityIndicator color={theme.color.primary} />
        <Text style={[styles.emptyMessage, styles.stateMessage]}>{label}</Text>
      </View>
      <View style={styles.skeleton} />
      <View style={[styles.skeleton, styles.skeletonShort]} />
    </View>
  );
}

export function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
}: Readonly<{
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}>) {
  return (
    <Modal
      testID="confirmation-modal"
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <SafeAreaView style={styles.overlay}>
        <View
          testID="confirmation-dialog"
          accessibilityViewIsModal
          style={styles.dialog}
        >
          <ScrollView
            testID="confirmation-scroll"
            style={styles.dialogScroll}
            contentContainerStyle={styles.dialogContent}
            keyboardShouldPersistTaps="handled"
          >
            <SectionHeader title={title} description={message} />
            <AppButton
              label={confirmLabel}
              onPress={onConfirm}
              loading={busy}
            />
            <AppButton
              label="Cancel"
              onPress={onCancel}
              disabled={busy}
              variant="secondary"
            />
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export function ScreenContainer({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.screenContent}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  text: { color: theme.color.foreground, lineHeight: 24 },
  bold: { fontWeight: "700" },
  button: {
    minHeight: theme.size.button,
    borderRadius: theme.radius.control,
    paddingHorizontal: theme.spacing.section,
    paddingVertical: theme.spacing.compact,
    flexDirection: "row",
    gap: theme.spacing.compact,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    flexShrink: 1,
    fontSize: theme.type.body,
    fontWeight: "700",
    textAlign: "center",
  },
  primary: { backgroundColor: theme.color.primary },
  secondary: { backgroundColor: theme.color.surfaceMuted },
  danger: { backgroundColor: theme.color.dangerSurface },
  dimmed: { opacity: 0.55 },
  onPrimary: { color: theme.color.onPrimary },
  field: { gap: theme.spacing.compact },
  label: {
    fontSize: theme.type.caption,
    fontWeight: "700",
    color: theme.color.foreground,
  },
  input: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.borderSoft,
    borderWidth: 1,
    borderRadius: theme.radius.control,
    minHeight: theme.size.button,
    paddingHorizontal: theme.spacing.section,
    paddingVertical: theme.spacing.compact,
    color: theme.color.foreground,
    fontSize: theme.type.body,
  },
  inputError: { borderColor: theme.color.danger },
  inputFocused: { borderColor: theme.color.primary, borderWidth: 2 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.compact,
    backgroundColor: theme.color.surface,
    borderColor: theme.color.borderSoft,
    borderWidth: 1,
    borderRadius: theme.radius.control,
    paddingHorizontal: theme.spacing.section,
  },
  inputWithIcon: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  errorText: {
    fontSize: theme.type.body,
    color: theme.color.danger,
    lineHeight: 24,
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.accentSurface,
  },
  avatarText: {
    color: theme.color.primary,
    fontSize: theme.type.body,
    fontWeight: "700",
  },
  badge: {
    borderRadius: theme.radius.status,
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing.compact,
    paddingVertical: theme.spacing.tight,
  },
  badgeText: {
    fontSize: theme.type.caption,
    fontWeight: "600",
    color: theme.color.primary,
  },
  successSurface: { backgroundColor: theme.color.readySurface },
  successText: { color: theme.color.ready },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.compact,
    paddingVertical: theme.spacing.compact,
    minHeight: theme.size.touchTarget,
    justifyContent: "center",
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.control,
    paddingHorizontal: theme.spacing.section,
  },
  chipText: {
    flexShrink: 1,
    fontSize: theme.type.caption,
    fontWeight: "600",
    color: theme.color.primary,
  },
  chipSelected: {
    backgroundColor: theme.color.accentSurface,
    borderColor: theme.color.secondary,
  },
  chipTextSelected: { fontWeight: "700" },
  sectionTitle: {
    color: theme.color.foreground,
    fontSize: theme.type.section,
    fontWeight: "700",
    lineHeight: 24,
  },
  muted: {
    color: theme.color.muted,
    fontSize: theme.type.body,
    lineHeight: 24,
  },
  state: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    borderColor: theme.color.border,
    borderWidth: 1,
    gap: theme.spacing.compact,
    padding: theme.spacing.section,
  },
  emptyArtwork: {
    alignSelf: "flex-start",
    padding: theme.spacing.tight,
  },
  emptyIntro: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.compact,
  },
  emptyCopy: { flex: 1, gap: theme.spacing.tight },
  emptyTitle: {
    color: theme.color.foreground,
    fontSize: theme.type.cardTitle,
    lineHeight: 22,
    fontWeight: "600",
  },
  emptyMessage: {
    color: theme.color.muted,
    fontSize: theme.type.supporting,
    lineHeight: 21,
  },
  stateAction: { alignSelf: "flex-start", maxWidth: "100%" },
  stateHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.compact,
  },
  stateMessage: { flex: 1 },
  artworkBack: {
    position: "absolute",
    top: theme.spacing.tight,
    left: theme.spacing.section,
    right: 0,
    bottom: theme.spacing.section,
    borderRadius: theme.radius.control,
    backgroundColor: theme.color.accentSurface,
    transform: [{ rotate: "8deg" }],
  },
  artworkPaper: {
    padding: theme.spacing.compact,
    gap: theme.spacing.tight,
    width: theme.size.touchTarget,
    borderWidth: 1,
    borderColor: theme.color.borderSoft,
    borderRadius: theme.radius.small,
    backgroundColor: theme.color.surface,
  },
  artworkLine: {
    height: theme.spacing.tight,
    borderRadius: theme.radius.small,
    backgroundColor: theme.color.border,
    width: "100%",
  },
  artworkShort: { width: "65%" },
  artworkDot: {
    position: "absolute",
    right: 0,
    bottom: theme.spacing.compact,
    height: theme.spacing.compact,
    width: theme.spacing.compact,
    borderRadius: theme.radius.status,
    backgroundColor: theme.color.mint,
  },
  skeleton: {
    height: theme.spacing.section,
    backgroundColor: theme.color.surfaceMuted,
    borderRadius: theme.radius.small,
    width: "100%",
  },
  skeletonShort: { width: "65%" },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.content,
    backgroundColor: theme.color.overlay,
  },
  dialog: {
    width: "100%",
    maxWidth: theme.size.contentMax,
    maxHeight: "100%",
    overflow: "hidden",
    borderRadius: theme.radius.card,
    backgroundColor: theme.color.surface,
  },
  dialogScroll: { flexGrow: 0, flexShrink: 1 },
  dialogContent: {
    padding: theme.spacing.content,
    gap: theme.spacing.section,
  },
  screen: { flex: 1, backgroundColor: theme.color.background },
  screenContent: {
    flexGrow: 1,
    width: "100%",
    maxWidth: theme.size.contentMax,
    alignSelf: "center",
    padding: theme.spacing.content,
    gap: theme.spacing.content,
  },
});
