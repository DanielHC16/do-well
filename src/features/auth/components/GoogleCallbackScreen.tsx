import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setupTheme } from "../../setup/setupTheme";
import type { AuthError } from "../model/auth-errors";

type GoogleCallbackScreenProps = Readonly<{
  error: AuthError | null;
  onReturnToSignIn: () => void;
}>;

export function GoogleCallbackScreen({
  error,
  onReturnToSignIn,
}: GoogleCallbackScreenProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        {error ? (
          <>
            <Text accessibilityRole="alert" style={styles.message}>
              {error.message}
            </Text>
            <Pressable
              accessibilityLabel="Return to sign in"
              accessibilityRole="button"
              onPress={onReturnToSignIn}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Return to sign in</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={setupTheme.color.foreground} />
            <Text style={styles.message}>Completing Google sign-in…</Text>
          </>
        )}
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
    alignItems: "center",
    flex: 1,
    gap: setupTheme.spacing.compact,
    justifyContent: "center",
    padding: setupTheme.spacing.content,
  },
  message: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.status,
    textAlign: "center",
  },
  button: {
    backgroundColor: setupTheme.color.foreground,
    borderRadius: setupTheme.spacing.compact,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: setupTheme.spacing.content,
    paddingVertical: setupTheme.spacing.compact,
  },
  buttonText: {
    color: setupTheme.color.background,
    fontSize: setupTheme.type.status,
    fontWeight: "700",
  },
});
