import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { setupTheme } from "../../setup/setupTheme";
import {
  type CreateReportInput,
  type ReportCategory,
} from "../model/report-schemas";
import { getReportGateway, type ReportGateway } from "../data/report-gateway";

const categories: readonly {
  value: ReportCategory;
  label: string;
  description: string;
}[] = [
  {
    value: "scam",
    label: "Scam or fraudulent activity",
    description: "Asking for advance fees, fake payments, or deceptive offers.",
  },
  {
    value: "unsafe",
    label: "Unsafe working conditions",
    description:
      "Hazardous site, lack of required safety gear, or extreme risk.",
  },
  {
    value: "harassment",
    label: "Harassment or inappropriate behavior",
    description: "Abusive language, intimidation, or inappropriate conduct.",
  },
  {
    value: "prohibited",
    label: "Prohibited services",
    description:
      "Illegal tasks, weapons, hazardous substances, or restricted goods.",
  },
  {
    value: "other",
    label: "Other issue",
    description: "Community guideline violation not covered above.",
  },
];

export type CreateReportScreenProps = Readonly<{
  targetType: "gig" | "profile" | "assignment";
  targetId: string;
  targetTitle?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  gateway?: ReportGateway;
}>;

export function CreateReportScreen({
  targetType,
  targetId,
  targetTitle,
  onSuccess,
  onCancel,
  gateway = getReportGateway(),
}: CreateReportScreenProps) {
  const [category, setCategory] = useState<ReportCategory>("scam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    const trimmed = details.trim();
    if (trimmed.length < 20) {
      setErrorMessage(
        "Please provide at least 20 characters explaining the issue.",
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const input: CreateReportInput = {
      category,
      details: trimmed,
      gigId: targetType === "gig" ? targetId : undefined,
      subjectProfileId: targetType === "profile" ? targetId : undefined,
      assignmentId: targetType === "assignment" ? targetId : undefined,
    };

    try {
      await gateway.submitReport(input);
      setSubmitted(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to submit report. Try again.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.successHeading}>Report submitted</Text>
          <Text style={styles.successBody}>
            Your report has been logged and queued for review by the community
            moderation team. Thank you for helping keep DO-WELL safe.
          </Text>
          {onCancel && (
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Return</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Report an issue</Text>
        <Text style={styles.subtitle}>
          All reports are confidential and audited by community administrators.
        </Text>
      </View>

      <View style={styles.targetBanner}>
        <Text style={styles.targetLabel}>Target</Text>
        <Text style={styles.targetTitle}>
          {targetTitle
            ? targetTitle
            : `${targetType.toUpperCase()}: ${targetId}`}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Select violation category</Text>
        {categories.map((cat) => {
          const isSelected = category === cat.value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              key={cat.value}
              onPress={() => setCategory(cat.value)}
              style={[
                styles.categoryOption,
                isSelected && styles.categoryOptionSelected,
              ]}
            >
              <View style={styles.radioRow}>
                <View
                  style={[
                    styles.radioOuter,
                    isSelected && styles.radioOuterSelected,
                  ]}
                >
                  {isSelected && <View style={styles.radioInner} />}
                </View>
                <View style={styles.categoryTextWrapper}>
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                  <Text style={styles.categoryDescription}>
                    {cat.description}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.section}>
        <View style={styles.detailsHeader}>
          <Text style={styles.sectionLabel}>Explanation</Text>
          <Text style={styles.charCount}>{details.trim().length} / 2000</Text>
        </View>
        <TextInput
          accessibilityLabel="Explanation details"
          maxLength={2000}
          multiline
          numberOfLines={5}
          onChangeText={(text) => {
            setDetails(text);
            if (errorMessage) setErrorMessage(null);
          }}
          placeholder="Explain clearly what happened (minimum 20 characters)..."
          placeholderTextColor={setupTheme.color.muted}
          style={styles.textArea}
          value={details}
        />
        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      </View>

      <View style={styles.buttonGroup}>
        <Pressable
          accessibilityRole="button"
          disabled={submitting}
          onPress={handleSubmit}
          style={[styles.primaryButton, submitting && styles.buttonDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color={setupTheme.color.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>Submit report</Text>
          )}
        </Pressable>

        {onCancel && (
          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={onCancel}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: setupTheme.color.background,
    flexGrow: 1,
    padding: setupTheme.spacing.content,
  },
  header: {
    marginBottom: setupTheme.spacing.section,
  },
  title: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  subtitle: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    marginTop: 4,
  },
  targetBanner: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    marginBottom: setupTheme.spacing.section,
    padding: setupTheme.spacing.section,
  },
  targetLabel: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  targetTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
    marginTop: 2,
  },
  section: {
    marginBottom: setupTheme.spacing.section,
  },
  sectionLabel: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
    marginBottom: setupTheme.spacing.compact,
  },
  categoryOption: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    marginBottom: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  categoryOptionSelected: {
    borderColor: setupTheme.color.border,
    borderWidth: 2,
  },
  radioRow: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  radioOuter: {
    alignItems: "center",
    borderColor: setupTheme.color.borderSoft,
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    marginRight: 10,
    marginTop: 2,
    width: 20,
  },
  radioOuterSelected: {
    borderColor: setupTheme.color.border,
  },
  radioInner: {
    backgroundColor: setupTheme.color.foreground,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  categoryTextWrapper: {
    flex: 1,
  },
  categoryLabel: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  categoryDescription: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    marginTop: 2,
  },
  detailsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  charCount: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
  },
  textArea: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    minHeight: 110,
    padding: setupTheme.spacing.section,
    textAlignVertical: "top",
  },
  errorText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.caption,
    marginTop: 4,
  },
  buttonGroup: {
    marginTop: setupTheme.spacing.compact,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.accent,
    borderRadius: setupTheme.radius.control,
    justifyContent: "center",
    marginBottom: setupTheme.spacing.compact,
    paddingVertical: setupTheme.spacing.section,
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
    paddingVertical: setupTheme.spacing.section,
  },
  secondaryButtonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  card: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.card,
    borderWidth: 1,
    padding: setupTheme.spacing.generous,
  },
  successHeading: {
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
    marginBottom: setupTheme.spacing.compact,
  },
  successBody: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
    marginBottom: setupTheme.spacing.content,
  },
});
