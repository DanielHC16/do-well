import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/context/useAuth";
import { OnboardingForm } from "@/features/profile/components/OnboardingForm";
import type { OnboardingProfile } from "@/features/profile/model/profile-schemas";
import { setupTheme } from "@/features/setup/setupTheme";
import { BrandLogo } from "@/shared/ui";

export default function OnboardingScreen() {
  const { completeOnboarding, state } = useAuth();
  const savedDisplayName = state.profile?.displayName;
  const initialDisplayName =
    savedDisplayName && savedDisplayName !== "New user" ? savedDisplayName : "";

  const submit = async ({
    displayName,
    homeArea,
    preferredMode,
  }: OnboardingProfile) => {
    await completeOnboarding(displayName, homeArea, preferredMode);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <BrandLogo size={96} />
          <OnboardingForm
            initialDisplayName={initialDisplayName}
            onSubmit={submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: setupTheme.color.background,
    flex: 1,
  },
  content: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 560,
    gap: setupTheme.spacing.content,
    flexGrow: 1,
    justifyContent: "center",
    padding: setupTheme.spacing.content,
  },
});
