import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setupTheme } from "../../setup/setupTheme";
import { toSafeAuthError, type AuthError } from "../model/auth-errors";

type GoogleSignInScreenProps = Readonly<{
  onSignIn: () => Promise<void>;
}>;

export function GoogleSignInScreen({ onSignIn }: GoogleSignInScreenProps) {
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  async function submit() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      await onSignIn();
    } catch (failure) {
      setError(toSafeAuthError(failure));
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            Do Well
          </Text>
          <Text style={styles.subtitle}>
            Sign in to find work or hire trusted local help.
          </Text>
        </View>

        {error ? (
          <View accessibilityRole="alert" style={styles.errorPanel}>
            <Text style={styles.errorText}>{error.message}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={() => void submit()}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          accessibilityLabel="Continue with Google"
          accessibilityRole="button"
          accessibilityState={{ busy: pending, disabled: pending }}
          disabled={pending}
          onPress={() => void submit()}
          style={[styles.primaryButton, pending && styles.disabledButton]}
        >
          {pending ? (
            <ActivityIndicator color={setupTheme.color.background} />
          ) : null}
          <Text style={styles.primaryButtonText}>
            {pending ? "Opening Google…" : "Continue with Google"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: setupTheme.color.background,
    flex: 1,
  },
  content: {
    flex: 1,
    gap: setupTheme.spacing.content,
    justifyContent: "center",
    padding: setupTheme.spacing.content,
  },
  heading: {
    gap: setupTheme.spacing.compact,
  },
  title: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.title,
    fontWeight: "700",
  },
  subtitle: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.status,
  },
  errorPanel: {
    backgroundColor: setupTheme.color.readySurface,
    borderRadius: setupTheme.spacing.compact,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.content,
  },
  errorText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.status,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.foreground,
    borderRadius: setupTheme.spacing.compact,
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    justifyContent: "center",
    minHeight: 52,
    padding: setupTheme.spacing.compact,
  },
  primaryButtonText: {
    color: setupTheme.color.background,
    fontSize: setupTheme.type.status,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.6,
  },
  secondaryButton: {
    alignSelf: "flex-start",
    paddingVertical: setupTheme.spacing.compact,
  },
  secondaryButtonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.status,
    fontWeight: "700",
  },
});
