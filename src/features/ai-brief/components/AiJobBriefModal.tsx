import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  GIG_CATEGORIES,
  GIG_CATEGORY_LABELS,
  GIG_WORK_MODES,
  type GigCategory,
  type GigWorkMode,
} from "@/features/gigs/model/gig-schemas";
import { setupTheme } from "@/features/setup/setupTheme";

import { aiBriefGateway, type AiBriefGateway } from "../data/ai-brief-gateway";
import type {
  JobBriefDraft,
  JobBriefResponse,
} from "../model/ai-brief-schemas";

export type AiJobBriefModalProps = Readonly<{
  visible: boolean;
  onClose: () => void;
  onApplyDraft: (draft: JobBriefDraft, publicArea?: string | null) => void;
  initialCategory?: GigCategory;
  initialWorkMode?: GigWorkMode;
  initialPublicArea?: string;
  gateway?: AiBriefGateway;
}>;

export function AiJobBriefModal({
  visible,
  onClose,
  onApplyDraft,
  initialCategory = "errands",
  initialWorkMode = "onsite",
  initialPublicArea = "",
  gateway = aiBriefGateway,
}: AiJobBriefModalProps) {
  const [taskSummary, setTaskSummary] = useState("");
  const [category, setCategory] = useState<GigCategory>(initialCategory);
  const [workMode, setWorkMode] = useState<GigWorkMode>(initialWorkMode);
  const [publicArea, setPublicArea] = useState(initialPublicArea);
  const [budgetPhp, setBudgetPhp] = useState("");
  const [customConstraints, setCustomConstraints] = useState("");

  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedResponse, setGeneratedResponse] =
    useState<JobBriefResponse | null>(null);

  // Editable fields in preview state
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");

  function handleReset() {
    setGeneratedResponse(null);
    setErrorMessage(null);
  }

  async function handleGenerate() {
    setErrorMessage(null);
    const trimmedSummary = taskSummary.trim();
    if (trimmedSummary.length < 10) {
      setErrorMessage("Task summary must be at least 10 characters.");
      return;
    }
    if (workMode !== "remote" && !publicArea.trim()) {
      setErrorMessage("Public area is required for onsite or hybrid work.");
      return;
    }

    setBusy(true);
    try {
      const constraintsList = customConstraints
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const parsedBudget = Number(budgetPhp);
      const budgetValue =
        !isNaN(parsedBudget) && parsedBudget > 0 ? parsedBudget : null;

      const response = await gateway.generateBrief({
        taskSummary: trimmedSummary,
        category,
        workMode,
        publicArea: workMode === "remote" ? null : publicArea.trim(),
        budgetPhp: budgetValue,
        constraints: constraintsList,
        tasks: [],
        skills: [],
      });

      setGeneratedResponse(response);
      setDraftTitle(response.draft.title);
      setDraftDescription(response.draft.description);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Draft generation failed.";
      setErrorMessage(msg);
    } finally {
      setBusy(false);
    }
  }

  function handleApply() {
    if (!generatedResponse) return;
    const finalDraft: JobBriefDraft = {
      ...generatedResponse.draft,
      title: draftTitle.trim() || generatedResponse.draft.title,
      description:
        draftDescription.trim() || generatedResponse.draft.description,
    };
    onApplyDraft(finalDraft, workMode === "remote" ? null : publicArea);
    onClose();
    handleReset();
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
      visible={visible}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="Close brief builder modal"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>Close ✕</Text>
          </Pressable>
          <Text style={styles.headerTitle}>JOB BRIEF BUILDER</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {errorMessage ? (
            <View accessibilityRole="alert" style={styles.errorBanner}>
              <Text style={styles.errorTitle}>ATTENTION</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {!generatedResponse ? (
            /* Input configuration screen */
            <View style={styles.formContainer}>
              <View style={styles.introCard}>
                <Text style={styles.introTitle}>QUICK SPECIFICATION</Text>
                <Text style={styles.introBody}>
                  Provide core task details below. Our builder will generate a
                  comprehensive brief with structured milestone tasks,
                  acceptance criteria, and safety reminders.
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  WHAT NEEDS TO BE DONE? (REQUIRED)
                </Text>
                <TextInput
                  accessibilityLabel="Task Summary"
                  multiline
                  numberOfLines={4}
                  onChangeText={setTaskSummary}
                  placeholder="Describe the task or project requirements..."
                  placeholderTextColor={setupTheme.color.muted}
                  style={styles.textArea}
                  value={taskSummary}
                />
                <Text style={styles.charCount}>
                  {taskSummary.length} / 1200 characters (min 10)
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>CATEGORY</Text>
                <View style={styles.pillGrid}>
                  {GIG_CATEGORIES.map((cat) => {
                    const selected = category === cat;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        key={cat}
                        onPress={() => setCategory(cat)}
                        style={[
                          styles.pill,
                          selected ? styles.pillSelected : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            selected ? styles.pillTextSelected : null,
                          ]}
                        >
                          {GIG_CATEGORY_LABELS[cat]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>WORK MODE</Text>
                <View style={styles.workModeRow}>
                  {GIG_WORK_MODES.map((mode) => {
                    const selected = workMode === mode;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        key={mode}
                        onPress={() => setWorkMode(mode)}
                        style={[
                          styles.pill,
                          selected ? styles.pillSelected : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            selected ? styles.pillTextSelected : null,
                          ]}
                        >
                          {mode.toUpperCase()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {workMode !== "remote" ? (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>GENERAL PUBLIC AREA</Text>
                  <TextInput
                    accessibilityLabel="General Public Area"
                    onChangeText={setPublicArea}
                    placeholder="e.g. Legaspi Village, Makati"
                    placeholderTextColor={setupTheme.color.muted}
                    style={styles.input}
                    value={publicArea}
                  />
                </View>
              ) : null}

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  ESTIMATED BUDGET (PHP, OPTIONAL)
                </Text>
                <TextInput
                  accessibilityLabel="Estimated Budget"
                  keyboardType="numeric"
                  onChangeText={setBudgetPhp}
                  placeholder="e.g. 1500"
                  placeholderTextColor={setupTheme.color.muted}
                  style={styles.input}
                  value={budgetPhp}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  CONSTRAINTS OR SPECIAL CONDITIONS
                </Text>
                <TextInput
                  accessibilityLabel="Constraints or Special Conditions"
                  multiline
                  numberOfLines={2}
                  onChangeText={setCustomConstraints}
                  placeholder="One constraint per line (e.g. Must bring own tools)"
                  placeholderTextColor={setupTheme.color.muted}
                  style={styles.input}
                  value={customConstraints}
                />
              </View>

              <Pressable
                accessibilityLabel="Generate Job Brief"
                accessibilityRole="button"
                disabled={busy}
                onPress={handleGenerate}
                style={[
                  styles.primaryButton,
                  busy ? styles.disabledButton : null,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={setupTheme.color.surface} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Generate Structured Brief →
                  </Text>
                )}
              </Pressable>
            </View>
          ) : (
            /* Review & Edit Screen */
            <View style={styles.previewContainer}>
              <View
                style={[
                  styles.provenanceBanner,
                  generatedResponse.meta.isFallback
                    ? styles.provenanceFallback
                    : styles.provenanceAi,
                ]}
              >
                <Text style={styles.provenanceTitle}>
                  {generatedResponse.meta.isFallback
                    ? "MANUAL TEMPLATE DRAFT"
                    : `AI DRAFT · ${generatedResponse.meta.model.toUpperCase()}`}
                </Text>
                <Text style={styles.provenanceBody}>
                  {generatedResponse.meta.isFallback
                    ? "Generated deterministically via structured template rules. Edit any field below before applying."
                    : "Generated with machine learning inference. You must review and confirm all details before posting."}
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>BRIEF TITLE</Text>
                <TextInput
                  accessibilityLabel="Draft Title"
                  onChangeText={setDraftTitle}
                  style={styles.input}
                  value={draftTitle}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>SCOPE & DESCRIPTION</Text>
                <TextInput
                  accessibilityLabel="Draft Description"
                  multiline
                  numberOfLines={6}
                  onChangeText={setDraftDescription}
                  style={styles.textArea}
                  value={draftDescription}
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  RECOMMENDED TASKS ({generatedResponse.draft.tasks.length})
                </Text>
                {generatedResponse.draft.tasks.map((task, idx) => (
                  <View key={idx} style={styles.taskItem}>
                    <Text style={styles.taskStep}>STEP {idx + 1}</Text>
                    <Text style={styles.taskDesc}>{task.description}</Text>
                    <Text style={styles.taskCriterion}>
                      ✓ Acceptance: {task.acceptanceCriterion}
                    </Text>
                  </View>
                ))}
              </View>

              {generatedResponse.draft.safetyNotes.length > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>SAFETY & COMPLIANCE</Text>
                  {generatedResponse.draft.safetyNotes.map((note, idx) => (
                    <Text key={idx} style={styles.bulletItem}>
                      • {note}
                    </Text>
                  ))}
                </View>
              ) : null}

              <Pressable
                accessibilityLabel="Apply Draft to Form"
                accessibilityRole="button"
                onPress={handleApply}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>
                  Use This Draft in Gig Form ✓
                </Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Regenerate or Edit Inputs"
                accessibilityRole="button"
                onPress={handleReset}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>← Back to Inputs</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: setupTheme.color.background,
    flex: 1,
  },
  topBar: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surface,
    borderBottomColor: setupTheme.color.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: setupTheme.spacing.section,
    paddingVertical: setupTheme.spacing.compact,
  },
  headerTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  closeButton: {
    padding: setupTheme.spacing.compact,
  },
  closeButtonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  content: {
    padding: setupTheme.spacing.section,
    paddingBottom: 40,
  },
  introCard: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    marginBottom: setupTheme.spacing.section,
    padding: setupTheme.spacing.section,
  },
  introTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 4,
  },
  introBody: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: 20,
  },
  formContainer: {
    gap: setupTheme.spacing.section,
  },
  previewContainer: {
    gap: setupTheme.spacing.section,
  },
  provenanceBanner: {
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    padding: setupTheme.spacing.section,
  },
  provenanceFallback: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  provenanceAi: {
    backgroundColor: "#F0FDF4",
    borderColor: "#22C55E",
  },
  provenanceTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 4,
  },
  provenanceBody: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 20,
  },
  fieldGroup: {
    gap: setupTheme.spacing.compact,
  },
  label: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "900",
    letterSpacing: 1,
  },
  input: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    padding: setupTheme.spacing.compact,
  },
  textArea: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    minHeight: 90,
    padding: setupTheme.spacing.compact,
    textAlignVertical: "top",
  },
  charCount: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    textAlign: "right",
  },
  pillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: setupTheme.spacing.compact,
  },
  workModeRow: {
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
  },
  pill: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    paddingHorizontal: setupTheme.spacing.section,
    paddingVertical: setupTheme.spacing.compact,
  },
  pillSelected: {
    backgroundColor: setupTheme.color.foreground,
    borderColor: setupTheme.color.foreground,
  },
  pillText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
  },
  pillTextSelected: {
    color: setupTheme.color.surface,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    justifyContent: "center",
    marginTop: setupTheme.spacing.compact,
    paddingVertical: setupTheme.spacing.section,
  },
  primaryButtonText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    justifyContent: "center",
    paddingVertical: setupTheme.spacing.compact,
  },
  secondaryButtonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.6,
  },
  card: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    padding: setupTheme.spacing.section,
  },
  cardTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: setupTheme.spacing.compact,
  },
  taskItem: {
    borderBottomColor: setupTheme.color.border,
    borderBottomWidth: 1,
    paddingVertical: setupTheme.spacing.compact,
  },
  taskStep: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "900",
  },
  taskDesc: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
    marginTop: 2,
  },
  taskCriterion: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    marginTop: 2,
  },
  bulletItem: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    marginVertical: 2,
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderColor: "#EF4444",
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    marginBottom: setupTheme.spacing.section,
    padding: setupTheme.spacing.section,
  },
  errorTitle: {
    color: "#B91C1C",
    fontSize: setupTheme.type.caption,
    fontWeight: "900",
  },
  errorText: {
    color: "#7F1D1D",
    fontSize: setupTheme.type.body,
    marginTop: 2,
  },
});
