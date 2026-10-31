import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "@/shared/ui/Typography";

import {
  onboardingProfileSchema,
  type OnboardingProfile,
} from "../model/profile-schemas";
import { setupTheme } from "../../setup/setupTheme";

type FieldErrors = Readonly<{
  displayName?: string;
  homeArea?: string;
}>;

export type OnboardingFormProps = Readonly<{
  initialDisplayName?: string;
  onSubmit: (profile: OnboardingProfile) => Promise<void>;
}>;

const submissionError =
  "We couldn't save your profile. Check your connection and try again.";

export function OnboardingForm({
  initialDisplayName = "",
  onSubmit,
}: OnboardingFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [homeArea, setHomeArea] = useState("");
  const [preferredMode, setPreferredMode] = useState<"worker" | "employer">(
    "worker",
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [hasSubmissionError, setHasSubmissionError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLock = useRef(false);

  const submit = async () => {
    if (submissionLock.current) return;

    const parsed = onboardingProfileSchema.safeParse({
      displayName,
      homeArea,
      preferredMode,
    });
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        displayName: errors.displayName?.[0],
        homeArea: errors.homeArea?.[0],
      });
      return;
    }

    submissionLock.current = true;
    setFieldErrors({});
    setHasSubmissionError(false);
    setIsSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } catch {
      setHasSubmissionError(true);
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.form}>
      <View style={styles.introduction}>
        <Text accessibilityRole="header" style={styles.title}>
          Complete your profile
        </Text>
        <Text style={styles.description}>
          Tell people what to call you and the public area where you work.
        </Text>
      </View>

      <View style={styles.detailsCard}>
        <View style={styles.field}>
          <Text nativeID="display-name-label" style={styles.label}>
            Display name
          </Text>
          <TextInput
            accessibilityLabel="Display name"
            autoCapitalize="words"
            autoComplete="name"
            editable={!isSubmitting}
            onChangeText={setDisplayName}
            returnKeyType="next"
            style={[
              styles.input,
              fieldErrors.displayName ? styles.inputError : null,
            ]}
            value={displayName}
          />
          {fieldErrors.displayName ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {fieldErrors.displayName}
            </Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text nativeID="home-area-label" style={styles.label}>
            City or public area
          </Text>
          <TextInput
            accessibilityLabel="City or public area"
            autoCapitalize="words"
            editable={!isSubmitting}
            onChangeText={setHomeArea}
            onSubmitEditing={() => void submit()}
            returnKeyType="done"
            style={[
              styles.input,
              fieldErrors.homeArea ? styles.inputError : null,
            ]}
            value={homeArea}
          />
          <Text style={styles.hint}>
            Share only a city, municipality, or neighborhood - not your full
            address.
          </Text>
          {fieldErrors.homeArea ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {fieldErrors.homeArea}
            </Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Start in a workspace</Text>
          <Text style={styles.hint}>
            Choose what you want to do first. You can switch at any time.
          </Text>
          <View accessibilityRole="radiogroup" style={styles.modeRow}>
            {(["worker", "employer"] as const).map((mode) => {
              const selected = preferredMode === mode;
              const label = mode === "worker" ? "Find work" : "Offer work";
              return (
                <Pressable
                  accessibilityLabel={label}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  disabled={isSubmitting}
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
      </View>
      {hasSubmissionError ? (
        <Text
          accessibilityLabel={submissionError}
          accessibilityRole="alert"
          style={styles.errorText}
        >
          {submissionError}
        </Text>
      ) : null}

      <Pressable
        accessibilityLabel={
          isSubmitting
            ? "Saving profile"
            : hasSubmissionError
              ? "Try again"
              : "Continue"
        }
        accessibilityRole="button"
        accessibilityState={{ busy: isSubmitting, disabled: isSubmitting }}
        disabled={isSubmitting}
        onPress={() => void submit()}
        style={({ pressed }) => [
          styles.button,
          isSubmitting ? styles.buttonDisabled : null,
          pressed && !isSubmitting ? styles.buttonPressed : null,
        ]}
      >
        <Text style={styles.buttonText}>
          {isSubmitting
            ? "Saving..."
            : hasSubmissionError
              ? "Try again"
              : "Continue"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  detailsCard: {
    backgroundColor: setupTheme.color.surface,
    borderWidth: 1,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.card,
    padding: setupTheme.spacing.section,
    gap: setupTheme.spacing.section,
  },
  form: {
    gap: setupTheme.spacing.section,
    width: "100%",
  },
  introduction: {
    gap: setupTheme.spacing.compact,
  },
  title: {
    lineHeight: 28,
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.heading,
    fontWeight: "600",
  },
  description: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.status,
    lineHeight: 22,
  },
  field: {
    gap: setupTheme.spacing.compact,
  },
  label: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "600",
  },
  input: {
    fontWeight: "400",
    minHeight: setupTheme.size.button,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.status,
    paddingHorizontal: setupTheme.spacing.section,
    paddingVertical: setupTheme.spacing.compact,
  },
  inputError: {
    borderColor: setupTheme.color.danger,
  },
  hint: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    lineHeight: 20,
  },
  modeRow: {
    flexWrap: "wrap",
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
  },
  modeButton: {
    backgroundColor: setupTheme.color.background,
    padding: setupTheme.spacing.compact,
    flexBasis: 120,
    alignItems: "center",
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  modeSelected: {
    borderColor: setupTheme.color.secondary,
    backgroundColor: setupTheme.color.accentSurface,
  },
  modeButtonText: {
    textAlign: "center",
    flexShrink: 1,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.status,
    fontWeight: "600",
  },
  modeSelectedText: {
    color: setupTheme.color.primary,
  },
  errorText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.status,
  },
  button: {
    minHeight: 52,
    alignItems: "center",
    backgroundColor: setupTheme.color.primary,
    borderRadius: setupTheme.spacing.compact,
    justifyContent: "center",
    paddingHorizontal: setupTheme.spacing.content,
    paddingVertical: setupTheme.spacing.compact,
  },
  buttonDisabled: {
    backgroundColor: setupTheme.color.muted,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonText: {
    color: setupTheme.color.onPrimary,
    fontSize: setupTheme.type.status,
    fontWeight: "700",
  },
});
