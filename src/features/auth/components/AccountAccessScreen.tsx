import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { setupTheme } from "@/features/setup/setupTheme";

import { toSafeAuthError } from "../model/auth-errors";
import {
  accountModeSchema,
  displayNameSchema,
  emailSchema,
  passwordSchema,
  type AccountMode,
} from "../model/auth-schemas";

const signInSchema = z.object({ email: emailSchema, password: passwordSchema });
const signUpSchema = signInSchema.extend({
  displayName: displayNameSchema,
  preferredMode: accountModeSchema,
});

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [preferredMode, setPreferredMode] = useState<AccountMode>("worker");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(operation: () => Promise<void>) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
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

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandBlock}>
          <Text style={styles.kicker}>DO / WELL · NEIGHBORHOOD WORK</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Work nearby. Hire with clarity.
          </Text>
          <Text style={styles.subtitle}>
            One account lets you find work or offer work whenever you need.
          </Text>
        </View>

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

        <Pressable
          accessibilityLabel="Continue with Google"
          accessibilityRole="button"
          disabled={pending}
          onPress={() => void run(onGoogleSignIn)}
          style={[styles.googleButton, pending && styles.disabled]}
        >
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>OR USE EMAIL</Text>
          <View style={styles.divider} />
        </View>

        {creating ? (
          <TextInput
            accessibilityLabel="Display name"
            autoCapitalize="words"
            editable={!pending}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={setupTheme.color.muted}
            style={styles.input}
            value={displayName}
          />
        ) : null}
        <TextInput
          accessibilityLabel="Email address"
          autoCapitalize="none"
          autoComplete="email"
          editable={!pending}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={setupTheme.color.muted}
          style={styles.input}
          value={email}
        />
        <TextInput
          accessibilityLabel="Password"
          autoCapitalize="none"
          autoComplete={creating ? "new-password" : "current-password"}
          editable={!pending}
          onChangeText={setPassword}
          placeholder="At least 12 characters"
          placeholderTextColor={setupTheme.color.muted}
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {creating ? (
          <View style={styles.modeCard}>
            <Text style={styles.modeTitle}>HOW WILL YOU START?</Text>
            <Text style={styles.modeHint}>
              You can switch between both workspaces later in Settings.
            </Text>
            <View style={styles.modeRow}>
              {(["worker", "employer"] as const).map((mode) => {
                const selected = preferredMode === mode;
                const label = mode === "worker" ? "Find work" : "Offer work";
                return (
                  <Pressable
                    accessibilityLabel={label}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    key={mode}
                    onPress={() => setPreferredMode(mode)}
                    style={[styles.modeButton, selected && styles.modeSelected]}
                  >
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
          </View>
        ) : null}

        <Pressable
          accessibilityLabel={creating ? "Create account" : "Sign in"}
          accessibilityRole="button"
          disabled={pending}
          onPress={() => void run(submitCredentials)}
          style={[styles.primaryButton, pending && styles.disabled]}
        >
          {pending ? (
            <ActivityIndicator color={setupTheme.color.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {creating ? "Create account" : "Sign in"}
            </Text>
          )}
        </Pressable>

        <Pressable
          accessibilityLabel={
            creating ? "I already have an account" : "Create an account"
          }
          accessibilityRole="button"
          disabled={pending}
          onPress={() => {
            setCreating((value) => !value);
            setError(null);
            setMessage(null);
          }}
          style={styles.switchButton}
        >
          <Text style={styles.switchText}>
            {creating ? "I already have an account" : "Create an account"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: setupTheme.color.background, flex: 1 },
  content: {
    gap: setupTheme.spacing.compact,
    justifyContent: "center",
    minHeight: "100%",
    padding: setupTheme.spacing.content,
  },
  brandBlock: {
    gap: setupTheme.spacing.compact,
    marginBottom: setupTheme.spacing.section,
  },
  kicker: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  title: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.title,
    fontWeight: "900",
  },
  subtitle: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
  },
  errorText: { color: setupTheme.color.danger, fontSize: setupTheme.type.body },
  successText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  googleButton: {
    alignItems: "center",
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 52,
  },
  googleButtonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    marginVertical: setupTheme.spacing.compact,
  },
  divider: { backgroundColor: setupTheme.color.border, flex: 1, height: 1 },
  dividerText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "800",
  },
  input: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1.5,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    minHeight: 52,
    paddingHorizontal: setupTheme.spacing.section,
  },
  modeCard: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  modeTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "900",
  },
  modeHint: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
  },
  modeRow: { flexDirection: "row", gap: setupTheme.spacing.compact },
  modeButton: {
    alignItems: "center",
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    flex: 1,
    minHeight: 46,
    justifyContent: "center",
  },
  modeSelected: { backgroundColor: setupTheme.color.foreground },
  modeButtonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
  modeSelectedText: { color: setupTheme.color.surface },
  primaryButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    justifyContent: "center",
    minHeight: 52,
  },
  primaryButtonText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
  switchButton: {
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  switchText: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
  disabled: { opacity: 0.55 },
});
