import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text, TextInput } from "@/shared/ui/Typography";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/context/useAuth";
import {
  AiJobBriefModal,
  aiBriefGateway,
  type AiBriefGateway,
  type JobBriefDraft,
} from "@/features/ai-brief";
import { setupTheme } from "@/features/setup/setupTheme";
import { AppButton, AppInput } from "@/shared/ui";
import {
  gigScheduleSchema,
  scheduleDateFromTimestamp,
} from "../model/gig-schedule";

import { gigDraftStore, type GigDraftStore } from "../data/gig-draft-store";
import { gigGateway, type GigGateway } from "../data/gig-gateway";
import {
  GIG_CATEGORIES,
  GIG_CATEGORY_LABELS,
  GIG_WORK_MODES,
  GigDraftFormSchema,
  type GigCategory,
  type GigWorkMode,
} from "../model/gig-schemas";

type GigFormScreenProps = Readonly<{
  gateway?: GigGateway;
  draftStore?: GigDraftStore;
  aiGateway?: AiBriefGateway;
}>;

export function GigFormScreen({
  aiGateway = aiBriefGateway,
  draftStore = gigDraftStore,
  gateway = gigGateway,
}: GigFormScreenProps) {
  const router = useRouter();
  const { state: authState } = useAuth();
  const userId = authState.userId ?? "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<GigCategory>("errands");
  const [workMode, setWorkMode] = useState<GigWorkMode>("onsite");
  const [publicArea, setPublicArea] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("500");
  const [dueDate, setDueDate] = useState("");
  const [applicationDate, setApplicationDate] = useState("");

  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedDraftNotice, setSavedDraftNotice] = useState(false);
  const [isBuilderModalVisible, setIsBuilderModalVisible] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [builderNotice, setBuilderNotice] = useState<string | null>(null);

  useEffect(() => {
    void aiGateway.checkAvailability().then((res) => {
      setAiAvailable(res.isAiAvailable);
    });
  }, [aiGateway]);

  async function handleApplyAiDraft(
    draft: JobBriefDraft,
    area?: string | null,
  ) {
    setTitle(draft.title);
    setDescription(draft.description);
    setCategory(draft.category);
    setWorkMode(draft.workMode);
    if (area !== undefined) {
      setPublicArea(area ?? "");
    }
    setBuilderNotice(
      "Job brief draft applied. You can edit any details below before posting.",
    );
    setTimeout(() => setBuilderNotice(null), 5000);

    if (userId) {
      try {
        await draftStore.save(userId, {
          title: draft.title,
          description: draft.description,
          category: draft.category,
          workMode: draft.workMode,
          publicArea: draft.workMode === "remote" ? null : (area ?? publicArea),
          budgetAmount: Number(budgetAmount) || 0,
          currency: "PHP",
          ...gigScheduleSchema.parse({ dueDate, applicationDate }),
        });
      } catch {
        // preserve in memory
      }
    }
  }

  useEffect(() => {
    if (!userId) return;
    void draftStore.read(userId).then((draft) => {
      if (draft) {
        if (draft.title) setTitle(draft.title);
        if (draft.description) setDescription(draft.description);
        if (draft.category) setCategory(draft.category);
        if (draft.workMode) setWorkMode(draft.workMode);
        if (draft.publicArea) setPublicArea(draft.publicArea);
        if (draft.budgetAmount) setBudgetAmount(String(draft.budgetAmount));
        setDueDate(scheduleDateFromTimestamp(draft.dueAt));
        setApplicationDate(
          scheduleDateFromTimestamp(draft.applicationDeadline),
        );
      }
    });
  }, [draftStore, userId]);

  function getFormValues(): Record<string, unknown> {
    return {
      title,
      description,
      category,
      workMode,
      publicArea: workMode === "remote" ? null : publicArea,
      budgetAmount: Number(budgetAmount),
      currency: "PHP",
      ...gigScheduleSchema.parse({ dueDate, applicationDate }),
    };
  }

  async function handleSaveDraft() {
    setErrorMessage(null);
    try {
      const schedule = gigScheduleSchema.parse({ dueDate, applicationDate });
      await draftStore.save(userId, {
        title,
        description,
        category,
        workMode,
        publicArea: workMode === "remote" ? null : publicArea,
        budgetAmount: Number(budgetAmount) || 0,
        currency: "PHP",
        ...schedule,
      });
      setSavedDraftNotice(true);
      setTimeout(() => setSavedDraftNotice(false), 3000);
    } catch {
      setErrorMessage("Could not preserve local draft.");
    }
  }

  async function handlePublish() {
    if (busy) return;
    setErrorMessage(null);
    const schedule = gigScheduleSchema.safeParse({ dueDate, applicationDate });
    if (!schedule.success) {
      setErrorMessage(
        schedule.error.issues[0]?.message ?? "Check your schedule.",
      );
      return;
    }
    const formValues = getFormValues();
    const parsed = GigDraftFormSchema.safeParse(formValues);

    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ?? "Please check form fields.",
      );
      return;
    }

    setBusy(true);
    try {
      const createdDraft = await gateway.createDraft(parsed.data, userId);
      const published = await gateway.publishGig(createdDraft.id);
      await draftStore.clear(userId);
      router.replace(`/(protected)/employer/gigs/${published.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Publishing failed.";
      setErrorMessage(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(protected)/employer")}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Post a gig</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.introduction}>
            <Text accessibilityRole="header" style={styles.pageTitle}>
              Create a gig
            </Text>
            <Text style={styles.introductionText}>
              Give people a clear brief, a fair offer, and a plan.
            </Text>
          </View>
          <View style={styles.aiNoticeCard}>
            <View style={styles.aiBadgeRow}>
              <Text style={styles.aiBadge}>Job brief assistant</Text>
              <Text style={styles.aiStatusPill}>
                {aiAvailable ? "AI READY" : "TEMPLATE BUILDER"}
              </Text>
            </View>
            <Text style={styles.aiBody}>
              {aiAvailable
                ? "Turn your task idea into a draft brief. Review and edit it before posting."
                : "Start with a structured template, then review and edit your brief."}
            </Text>
            <Pressable
              accessibilityLabel="Draft with Brief Builder"
              accessibilityRole="button"
              onPress={() => setIsBuilderModalVisible(true)}
              style={styles.openBuilderButton}
            >
              <Text style={styles.openBuilderButtonText}>
                {aiAvailable
                  ? "Draft with AI Builder →"
                  : "Draft with Template Builder →"}
              </Text>
            </Pressable>
          </View>

          {builderNotice ? (
            <View accessibilityRole="alert" style={styles.builderNoticeBanner}>
              <Text style={styles.builderNoticeText}>{builderNotice}</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View accessibilityRole="alert" style={styles.errorBanner}>
              <Text style={styles.errorTitle}>Cannot post notice</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {savedDraftNotice ? (
            <View accessibilityRole="alert" style={styles.successBanner}>
              <Text style={styles.successText}>
                Draft preserved on this device.
              </Text>
            </View>
          ) : null}

          <View style={styles.formSection}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              The essentials
            </Text>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>What needs doing?</Text>
              <TextInput
                accessibilityLabel="Gig Title"
                onChangeText={setTitle}
                placeholder="e.g. Paint Front Garden Fence"
                placeholderTextColor={setupTheme.color.muted}
                style={styles.input}
                value={title}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Category</Text>
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
          </View>
          <View style={styles.formSection}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Location & compensation
            </Text>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Work mode</Text>
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
                <Text style={styles.label}>Neighborhood area</Text>
                <TextInput
                  accessibilityLabel="Neighborhood Area"
                  onChangeText={setPublicArea}
                  placeholder="e.g. Poblacion, Makati"
                  placeholderTextColor={setupTheme.color.muted}
                  style={styles.input}
                  value={publicArea}
                />
                <Text style={styles.hint}>
                  Keep this general (e.g. barangay or district). Exact
                  coordinates are never made public.
                </Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Budget (PHP)</Text>
              <TextInput
                accessibilityLabel="Budget in Philippine Pesos"
                keyboardType="numeric"
                onChangeText={setBudgetAmount}
                placeholder="500"
                placeholderTextColor={setupTheme.color.muted}
                style={styles.input}
                value={budgetAmount}
              />
            </View>
          </View>
          <View style={styles.formSection}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Work details
            </Text>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Detailed instructions</Text>
              <TextInput
                accessibilityLabel="Description"
                multiline
                numberOfLines={4}
                onChangeText={setDescription}
                placeholder="Describe what the worker needs to do, tools provided, and timing expectations."
                placeholderTextColor={setupTheme.color.muted}
                style={[styles.input, styles.multilineInput]}
                value={description}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Schedule · optional</Text>
              <Text style={styles.hint}>
                Use YYYY-MM-DD. Dates end at 11:59 PM, Philippine time.
              </Text>
              <AppInput
                label="Applications close on"
                placeholder="2026-11-08"
                value={applicationDate}
                onChangeText={setApplicationDate}
                maxLength={10}
                autoCapitalize="none"
                editable={!busy}
              />
              <AppInput
                label="Work due on"
                placeholder="2026-11-10"
                value={dueDate}
                onChangeText={setDueDate}
                maxLength={10}
                autoCapitalize="none"
                editable={!busy}
              />
            </View>
          </View>
          <View style={styles.actionRow}>
            <AppButton
              label="Post notice"
              onPress={() => void handlePublish()}
              loading={busy}
            />
            <AppButton
              label="Save draft"
              onPress={() => void handleSaveDraft()}
              disabled={busy}
              variant="secondary"
            />
          </View>
          <AiJobBriefModal
            gateway={aiGateway}
            initialCategory={category}
            initialPublicArea={publicArea}
            initialWorkMode={workMode}
            onApplyDraft={handleApplyAiDraft}
            onClose={() => setIsBuilderModalVisible(false)}
            visible={isBuilderModalVisible}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  introduction: { gap: setupTheme.spacing.compact },
  pageTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "600",
  },
  introductionText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
  },
  formSection: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderWidth: 1,
    borderRadius: setupTheme.radius.card,
    padding: setupTheme.spacing.section,
    gap: setupTheme.spacing.section,
  },
  sectionTitle: {
    fontSize: setupTheme.type.section,
    color: setupTheme.color.primary,
    fontWeight: "600",
  },
  safeArea: {
    backgroundColor: setupTheme.color.background,
    flex: 1,
  },
  topBar: {
    alignItems: "center",
    borderBottomColor: setupTheme.color.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: setupTheme.spacing.section,
    paddingVertical: setupTheme.spacing.compact,
  },
  backButton: {
    minHeight: setupTheme.size.touchTarget,
    justifyContent: "center",
    paddingVertical: setupTheme.spacing.compact,
  },
  backButtonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
  },
  headerTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
  },
  content: {
    alignSelf: "center",
    width: "100%",
    maxWidth: setupTheme.size.contentMax,
    gap: setupTheme.spacing.section,
    padding: setupTheme.spacing.section,
    paddingBottom: setupTheme.spacing.generous,
  },
  aiNoticeCard: {
    backgroundColor: setupTheme.color.accentSurface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.card,
    borderWidth: 1,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.compact + setupTheme.spacing.tight,
  },
  aiBadgeRow: {
    flexWrap: "wrap",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  aiBadge: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "600",
  },
  aiStatusPill: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.status,
    borderWidth: 0,
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.caption,
    fontWeight: "600",
    paddingHorizontal: setupTheme.spacing.compact,
    paddingVertical: setupTheme.spacing.tight,
  },
  aiBody: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: setupTheme.color.dangerSurface,
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    gap: setupTheme.spacing.tight,
    padding: setupTheme.spacing.section,
  },
  errorTitle: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
  },
  errorText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
  },
  successBanner: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    padding: setupTheme.spacing.compact,
  },
  successText: {
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.caption,
    fontWeight: "600",
  },
  fieldGroup: {
    gap: setupTheme.spacing.compact,
  },
  label: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "600",
  },
  input: {
    paddingVertical: setupTheme.spacing.compact,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "400",
    minHeight: setupTheme.size.button,
    paddingHorizontal: setupTheme.spacing.section,
  },
  multilineInput: {
    minHeight: 100,
    paddingVertical: setupTheme.spacing.compact,
    textAlignVertical: "top",
  },
  hint: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    lineHeight: 16,
  },
  pillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: setupTheme.spacing.compact,
  },
  workModeRow: {
    flexWrap: "wrap",
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
  },
  pill: {
    minHeight: 48,
    justifyContent: "center",
    backgroundColor: setupTheme.color.background,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    paddingHorizontal: setupTheme.spacing.section,
    paddingVertical: setupTheme.spacing.compact,
  },
  pillSelected: {
    backgroundColor: setupTheme.color.accentSurface,
    borderColor: setupTheme.color.secondary,
  },
  pillText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "600",
  },
  pillTextSelected: {
    color: setupTheme.color.primary,
  },
  actionRow: {
    flexWrap: "wrap",
    flexDirection: "column",
    gap: setupTheme.spacing.section,
    marginTop: setupTheme.spacing.compact,
  },

  openBuilderButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderWidth: 1,
    minHeight: setupTheme.size.touchTarget,
    borderRadius: setupTheme.radius.control,
    justifyContent: "center",
    marginTop: setupTheme.spacing.compact,
    paddingVertical: setupTheme.spacing.compact,
  },
  openBuilderButtonText: {
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
  },
  builderNoticeBanner: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    padding: setupTheme.spacing.compact,
  },
  builderNoticeText: {
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.caption,
    fontWeight: "600",
  },
});
