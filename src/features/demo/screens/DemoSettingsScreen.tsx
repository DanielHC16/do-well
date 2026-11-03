import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { DemoShell, demoStyles } from "@/features/demo/components/DemoShell";
import { useDemo } from "@/features/demo/context/useDemo";
import { DEMO_EMPLOYER, DEMO_WORKER } from "@/features/demo/model/demo-state";
import { setupTheme } from "@/features/setup/setupTheme";

export function DemoSettingsScreen() {
  const { busy, error, reset, state, switchPersona } = useDemo();
  const current =
    state.activePersona === "employer" ? DEMO_EMPLOYER : DEMO_WORKER;

  function confirmReset() {
    Alert.alert(
      "Reset workspace?",
      "This clears your current work progress and restores the starting listings on this device.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: () => void reset() },
      ],
    );
  }

  return (
    <DemoShell
      busy={busy}
      error={error}
      title="Account settings"
      subtitle="Manage your account and workspace."
    >
      <View style={demoStyles.card}>
        <Text style={demoStyles.label}>Current account</Text>
        <Text style={demoStyles.sectionTitle}>{current.displayName}</Text>
        <Text style={demoStyles.mutedText}>
          {current.role === "employer" ? "Employer" : "Worker"}
        </Text>
      </View>
      <View style={styles.section}>
        <Text style={demoStyles.sectionTitle}>Switch account</Text>
        <Text style={demoStyles.mutedText}>
          Your work stays saved when you change accounts.
        </Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Available accounts"
          style={styles.section}
        >
          {[DEMO_EMPLOYER, DEMO_WORKER].map((persona) => {
            const active = persona.role === state.activePersona;
            const roleLabel =
              persona.role === "employer" ? "Employer" : "Worker";
            return (
              <Pressable
                accessibilityLabel={`${persona.displayName}, ${roleLabel}`}
                accessibilityRole="radio"
                accessibilityState={{
                  checked: active,
                  disabled: busy || active,
                }}
                disabled={busy || active}
                key={persona.id}
                onPress={() => void switchPersona(persona.role)}
                style={[
                  demoStyles.card,
                  active ? styles.selectedAccount : null,
                  busy ? demoStyles.buttonDisabled : null,
                ]}
              >
                <Text style={demoStyles.sectionTitle}>
                  {persona.displayName}
                </Text>
                <Text style={demoStyles.mutedText}>
                  {roleLabel}
                  {active ? " · Current account" : " · Switch to this account"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.section}>
        <Text style={demoStyles.sectionTitle}>Workspace</Text>
        <Text style={demoStyles.mutedText}>
          Start again with the original listings when you need a fresh
          workspace.
        </Text>
        <Pressable
          accessibilityLabel="Reset workspace"
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={confirmReset}
          style={demoStyles.secondaryButton}
        >
          <Text style={styles.resetText}>Reset workspace</Text>
        </Pressable>
      </View>
    </DemoShell>
  );
}

const styles = StyleSheet.create({
  section: { gap: setupTheme.spacing.section },
  selectedAccount: {
    borderColor: setupTheme.color.secondary,
    backgroundColor: setupTheme.color.accentSurface,
  },
  resetText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
});
