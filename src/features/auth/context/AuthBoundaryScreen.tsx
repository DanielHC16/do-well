import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setupTheme } from "../../setup/setupTheme";
import { BrandLogo } from "@/shared/ui";

type AuthBoundaryScreenProps = Readonly<{
  message: string;
  onRetry?: () => void;
}>;

export function AuthBoundaryScreen({
  message,
  onRetry,
}: AuthBoundaryScreenProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <BrandLogo size={120} />
        <Text accessibilityRole="header" style={styles.title}>
          Do Well
        </Text>
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </Text>
        {onRetry ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        ) : null}
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
  title: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.title,
    fontWeight: "700",
  },
  message: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.status,
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: setupTheme.color.readySurface,
    borderRadius: setupTheme.radius.status,
    paddingHorizontal: setupTheme.spacing.content,
    paddingVertical: setupTheme.spacing.compact,
  },
  buttonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.status,
    fontWeight: "600",
  },
});
