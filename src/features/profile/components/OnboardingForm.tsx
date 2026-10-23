import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [hasSubmissionError, setHasSubmissionError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLock = useRef(false);

  const submit = async () => {
    if (submissionLock.current) return;

    const parsed = onboardingProfileSchema.safeParse({ displayName, homeArea });
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
  form: {
    gap: setupTheme.spacing.content,
    width: "100%",
  },
  introduction: {
    gap: setupTheme.spacing.compact,
  },
  title: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.title,
    fontWeight: "700",
  },
  description: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.status,
    lineHeight: setupTheme.spacing.content,
  },
  field: {
    gap: setupTheme.spacing.compact,
  },
  label: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.status,
    fontWeight: "600",
  },
  input: {
    backgroundColor: setupTheme.color.background,
    borderColor: setupTheme.color.muted,
    borderRadius: setupTheme.spacing.compact,
    borderWidth: 1,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.status,
    paddingHorizontal: setupTheme.spacing.content,
    paddingVertical: setupTheme.spacing.compact,
  },
  inputError: {
    borderColor: setupTheme.color.foreground,
  },
  hint: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.status,
  },
  errorText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.status,
  },
  button: {
    alignItems: "center",
    backgroundColor: setupTheme.color.foreground,
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
    color: setupTheme.color.background,
    fontSize: setupTheme.type.status,
    fontWeight: "700",
  },
});
