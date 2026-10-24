import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/context/useAuth";
import { OnboardingForm } from "@/features/profile/components/OnboardingForm";
import type { OnboardingProfile } from "@/features/profile/model/profile-schemas";
import { setupTheme } from "@/features/setup/setupTheme";

export default function OnboardingScreen() {
  const { completeOnboarding, state } = useAuth();
  const savedDisplayName = state.profile?.displayName;
  const initialDisplayName =
    savedDisplayName && savedDisplayName !== "New user" ? savedDisplayName : "";

  const submit = async ({ displayName, homeArea }: OnboardingProfile) => {
    await completeOnboarding(displayName, homeArea);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <OnboardingForm
          initialDisplayName={initialDisplayName}
          onSubmit={submit}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: setupTheme.color.background,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: setupTheme.spacing.content,
  },
});
