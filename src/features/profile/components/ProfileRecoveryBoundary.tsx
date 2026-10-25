import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/context/useAuth";
import { setupTheme } from "@/features/setup/setupTheme";

export function ProfileRecoveryBoundary() {
  const { refresh, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <Text style={styles.kicker}>PROFILE RECOVERY</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Profile temporarily unavailable
        </Text>
        <Text style={styles.body}>
          We could not load your verified account profile. Please check your
          connection and refresh your session.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={refreshing}
          onPress={handleRefresh}
          style={[styles.primaryButton, refreshing && styles.buttonDisabled]}
        >
          {refreshing ? (
            <ActivityIndicator color={setupTheme.color.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>Refresh Profile</Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => void signOut()}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    alignItems: "center",
    backgroundColor: setupTheme.color.background,
    flex: 1,
    justifyContent: "center",
    padding: setupTheme.spacing.section,
  },
  card: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.section,
    maxWidth: 520,
    padding: setupTheme.spacing.content,
    width: "100%",
  },
  kicker: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  title: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  body: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.accent,
    borderRadius: setupTheme.radius.control,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: setupTheme.spacing.section,
  },
  primaryButtonText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: setupTheme.spacing.section,
  },
  secondaryButtonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
