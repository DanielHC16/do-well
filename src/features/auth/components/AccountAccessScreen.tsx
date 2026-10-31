import { Text, TextInput } from "@/shared/ui/Typography";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
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
import { z } from "zod";

import { AppButton, AppInput, BrandLogo, setupTheme } from "@/shared/ui";
import { AppIcon } from "@/shared/ui/AppIcon";

import { toSafeAuthError } from "../model/auth-errors";
import {
  accountModeSchema,
  displayNameSchema,
  emailSchema,
  passwordSchema,
  type AccountMode,
} from "../model/auth-schemas";
import { WelcomeWalkthrough } from "./WelcomeWalkthrough";

const signInSchema = z.object({ email: emailSchema, password: passwordSchema });
const signUpSchema = signInSchema.extend({
  displayName: displayNameSchema,
  preferredMode: accountModeSchema,
});

const authLayout = { logoSize: 48, headingSize: 28, maxWidth: 480 };

type AccountAccessScreenProps = Readonly<{
  onGoogleSignIn: () => Promise<void>;
  onPasswordSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (
    email: string,
    password: string,
    displayName: string,
    preferredMode: AccountMode,
  ) => Promise<void>;
}>;

export function AccountAccessScreen({
  onGoogleSignIn,
  onPasswordSignIn,
  onSignUp,
}: AccountAccessScreenProps) {
  const pendingRef = useRef(false);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(false);
  const [pendingMethod, setPendingMethod] = useState<"email" | "google" | null>(
    null,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showIntroduction, setShowIntroduction] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [preferredMode, setPreferredMode] = useState<AccountMode>("worker");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(
    operation: () => Promise<void>,
    method: "email" | "google" = "email",
  ) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setPendingMethod(method);
    setError(null);
    setMessage(null);
    try {
      await operation();
    } catch (failure) {
      if (failure instanceof z.ZodError) {
        setError(
          failure.issues[0]?.message ?? "Check the details and try again.",
        );
      } else {
        setError(toSafeAuthError(failure).message);
      }
    } finally {
      pendingRef.current = false;
      setPending(false);
      setPendingMethod(null);
    }
  }

  async function submitCredentials() {
    if (creating) {
      const parsed = signUpSchema.parse({
        displayName,
        email,
        password,
        preferredMode,
      });
      await onSignUp(
        parsed.email,
        parsed.password,
        parsed.displayName,
        parsed.preferredMode,
      );
      setMessage("Check your email to finish creating your account.");
      return;
    }
    const parsed = signInSchema.parse({ email, password });
    await onPasswordSignIn(parsed.email, parsed.password);
  }

  function chooseAccessMode(nextCreating: boolean) {
    if (pendingRef.current || creating === nextCreating) return;
    setCreating(nextCreating);
    setError(null);
    setMessage(null);
  }

  if (showIntroduction) {
    return (
      <>
        <StatusBar style="dark" />
        <WelcomeWalkthrough onFinish={() => setShowIntroduction(false)} />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandRow}>
            <BrandLogo size={authLayout.logoSize} />
            <View style={styles.brandCopy}>
              <Text style={styles.brandName}>Do Well</Text>
              <Text style={styles.brandTagline}>Good work. Close to home.</Text>
            </View>
          </View>

          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>
              {creating ? "Create your account" : "Welcome back"}
            </Text>
            <Text style={styles.subtitle}>
              {creating
                ? "Find flexible gigs or hire local help."
                : "Sign in to find work or get a task done."}
            </Text>
          </View>

          <View
            accessibilityRole="tablist"
            accessibilityLabel="Account access"
            style={styles.accessTabs}
          >
            {([false, true] as const).map((isCreating) => {
              const selected = creating === isCreating;
              return (
                <Pressable
                  key={String(isCreating)}
                  accessibilityRole="tab"
                  accessibilityLabel={
                    isCreating
                      ? "Create an account"
                      : "I already have an account"
                  }
                  accessibilityState={{ selected, disabled: pending }}
                  disabled={pending}
                  onPress={() => chooseAccessMode(isCreating)}
                  style={[
                    styles.accessTab,
                    selected && styles.accessTabSelected,
                  ]}
                >
                  <AppIcon
                    name={isCreating ? "plus" : "user"}
                    size={18}
                    color={
                      selected
                        ? setupTheme.color.primary
                        : setupTheme.color.muted
                    }
                  />
                  <Text
                    style={[
                      styles.accessTabText,
                      selected && styles.accessTabTextSelected,
                    ]}
                  >
                    {isCreating ? "Create account" : "Sign in"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.formCard}>
            {creating ? (
              <AppInput
                label="Display name"
                leadingIcon="user"
                autoCapitalize="words"
                autoComplete="name"
                editable={!pending}
                maxLength={80}
                onChangeText={setDisplayName}
                placeholder="Your name"
                value={displayName}
              />
            ) : null}
            <AppInput
              label="Email address"
              leadingIcon="mail"
              autoCapitalize="none"
              autoComplete="email"
              editable={!pending}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              value={email}
            />

            <View>
              <View style={styles.passwordLabelRow}>
                <View style={styles.passwordLabel}>
                  <AppIcon
                    name="lock"
                    size={16}
                    color={setupTheme.color.muted}
                  />
                  <Text style={styles.inputLabel}>Password</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    passwordVisible ? "Hide password" : "Show password"
                  }
                  accessibilityState={{
                    selected: passwordVisible,
                    disabled: pending,
                  }}
                  disabled={pending}
                  onPress={() => setPasswordVisible((value) => !value)}
                  style={styles.passwordToggle}
                >
                  <AppIcon
                    name={passwordVisible ? "eyeOff" : "eye"}
                    size={18}
                    color={setupTheme.color.primary}
                  />
                  <Text style={styles.linkText}>
                    {passwordVisible ? "Hide" : "Show"}
                  </Text>
                </Pressable>
              </View>
              <TextInput
                accessibilityLabel="Password"
                autoCapitalize="none"
                autoComplete={creating ? "new-password" : "current-password"}
                editable={!pending}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                placeholder={
                  creating ? "Create a strong password" : "Enter your password"
                }
                placeholderTextColor={setupTheme.color.muted}
                secureTextEntry={!passwordVisible}
                style={[
                  styles.passwordInput,
                  passwordFocused && styles.passwordInputFocused,
                ]}
                value={password}
                returnKeyType="go"
                onSubmitEditing={() => void run(submitCredentials)}
              />
              {creating ? (
                <Text style={styles.passwordHint}>
                  Use 12+ characters with uppercase, lowercase, and a number.
                </Text>
              ) : null}
            </View>

            {creating ? (
              <View style={styles.modeCard}>
                <Text style={styles.inputLabel}>
                  How would you like to start?
                </Text>
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel="Starting workspace"
                  style={styles.modeRow}
                >
                  {(["worker", "employer"] as const).map((mode) => {
                    const selected = preferredMode === mode;
                    const label =
                      mode === "worker" ? "Find work" : "Offer work";
                    return (
                      <Pressable
                        accessibilityLabel={label}
                        accessibilityRole="radio"
                        accessibilityState={{
                          checked: selected,
                          selected,
                          disabled: pending,
                        }}
                        disabled={pending}
                        key={mode}
                        onPress={() => setPreferredMode(mode)}
                        style={[
                          styles.modeButton,
                          selected && styles.modeSelected,
                        ]}
                      >
                        <AppIcon
                          name={mode === "worker" ? "briefcase" : "layers"}
                          size={18}
                          color={
                            selected
                              ? setupTheme.color.onPrimary
                              : setupTheme.color.primary
                          }
                        />
                        <Text
                          style={[
                            styles.modeButtonText,
                            selected && styles.modeSelectedText,
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.modeHint}>
                  You can switch workspaces anytime.
                </Text>
              </View>
            ) : null}

            {error ? (
              <Text accessibilityRole="alert" style={styles.errorText}>
                {error}
              </Text>
            ) : null}
            {message ? (
              <Text accessibilityRole="alert" style={styles.successText}>
                {message}
              </Text>
            ) : null}
            <AppButton
              label={creating ? "Create account" : "Sign in"}
              icon="arrowRight"
              onPress={() => void run(submitCredentials)}
              loading={pending && pendingMethod === "email"}
              disabled={pending}
            />
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.divider} />
          </View>
          <Pressable
            accessibilityLabel="Continue with Google"
            accessibilityRole="button"
            accessibilityState={{
              disabled: pending,
              busy: pending && pendingMethod === "google",
            }}
            disabled={pending}
            onPress={() => void run(onGoogleSignIn, "google")}
            style={({ pressed }) => [
              styles.googleButton,
              (pending || pressed) && styles.disabled,
            ]}
          >
            {pending && pendingMethod === "google" ? (
              <ActivityIndicator color={setupTheme.color.primary} />
            ) : null}
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="How Do Well works"
            onPress={() => setShowIntroduction(true)}
            style={styles.introductionButton}
            disabled={pending}
          >
            <AppIcon name="help" size={18} color={setupTheme.color.muted} />
            <Text style={styles.footerText}>How Do Well works</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: setupTheme.color.background, flex: 1 },
  content: {
    alignSelf: "center",
    width: "100%",
    maxWidth: authLayout.maxWidth,
    gap: setupTheme.spacing.section,
    padding: setupTheme.spacing.section,
    paddingBottom: setupTheme.spacing.content,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: setupTheme.spacing.compact,
    backgroundColor: setupTheme.color.accentSurface,
    borderRadius: setupTheme.radius.card,
    padding: setupTheme.spacing.section,
  },
  brandCopy: { flex: 1, gap: setupTheme.spacing.tight },
  brandName: {
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.heading,
    fontWeight: "700",
  },
  brandTagline: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
  },
  heading: { gap: setupTheme.spacing.tight },
  title: {
    color: setupTheme.color.primary,
    fontSize: authLayout.headingSize,
    fontWeight: "700",
  },
  subtitle: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: 24,
  },
  accessTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: setupTheme.spacing.tight,
    backgroundColor: setupTheme.color.surfaceMuted,
    borderRadius: setupTheme.radius.control,
    padding: setupTheme.spacing.tight,
  },
  accessTab: {
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    flex: 1,
    flexBasis: 120,
    alignItems: "center",
    justifyContent: "center",
    minHeight: setupTheme.size.touchTarget,
    borderRadius: setupTheme.radius.control,
    padding: setupTheme.spacing.compact,
  },
  accessTabSelected: {
    backgroundColor: setupTheme.color.surface,
    ...setupTheme.shadow.card,
  },
  accessTabText: {
    flexShrink: 1,
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
    textAlign: "center",
  },
  accessTabTextSelected: { color: setupTheme.color.primary, fontWeight: "700" },
  formCard: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderWidth: 1,
    borderRadius: setupTheme.radius.card,
    padding: setupTheme.spacing.section,
    gap: setupTheme.spacing.section,
    ...setupTheme.shadow.card,
  },
  inputLabel: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
  },
  passwordLabelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: setupTheme.spacing.compact,
  },
  passwordToggle: {
    flexDirection: "row",
    gap: setupTheme.spacing.tight,
    minWidth: setupTheme.size.touchTarget,
    minHeight: setupTheme.size.touchTarget,
    paddingHorizontal: setupTheme.spacing.compact,
    justifyContent: "center",
    alignItems: "center",
  },
  linkText: {
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
  },
  passwordLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: setupTheme.spacing.tight,
  },
  passwordInput: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderWidth: 1,
    borderRadius: setupTheme.radius.control,
    minHeight: setupTheme.size.button,
    paddingHorizontal: setupTheme.spacing.section,
    paddingVertical: setupTheme.spacing.compact,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
  },
  passwordInputFocused: {
    borderColor: setupTheme.color.primary,
    borderWidth: 2,
  },
  passwordHint: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    lineHeight: 20,
    marginTop: setupTheme.spacing.compact,
  },
  modeCard: {
    gap: setupTheme.spacing.compact,
    backgroundColor: setupTheme.color.accentSurface,
    borderRadius: setupTheme.radius.control,
    padding: setupTheme.spacing.compact,
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: setupTheme.spacing.compact,
  },
  modeButton: {
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    flex: 1,
    flexBasis: 100,
    minHeight: setupTheme.size.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderColor: setupTheme.color.borderSoft,
    borderWidth: 1,
    borderRadius: setupTheme.radius.control,
    padding: setupTheme.spacing.compact,
  },
  modeSelected: {
    backgroundColor: setupTheme.color.primary,
    borderColor: setupTheme.color.primary,
  },
  modeButtonText: {
    flexShrink: 1,
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
    textAlign: "center",
  },
  modeSelectedText: { color: setupTheme.color.onPrimary },
  modeHint: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    lineHeight: 20,
  },
  errorText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
    lineHeight: 24,
  },
  successText: {
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.body,
    lineHeight: 24,
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
  },
  divider: { backgroundColor: setupTheme.color.borderSoft, flex: 1, height: 1 },
  dividerText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
  },
  googleButton: {
    minHeight: setupTheme.size.button,
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderWidth: 1,
    borderRadius: setupTheme.radius.control,
    padding: setupTheme.spacing.compact,
  },
  googleButtonText: {
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
    textAlign: "center",
  },
  introductionButton: {
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    minHeight: setupTheme.size.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    padding: setupTheme.spacing.compact,
  },
  footerText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "600",
  },
  disabled: { opacity: 0.55 },
});
