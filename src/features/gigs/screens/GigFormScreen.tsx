import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/context/useAuth";
import { setupTheme } from "@/features/setup/setupTheme";

import { gigDraftStore, type GigDraftStore } from "../data/gig-draft-store";
import { gigGateway, type GigGateway } from "../data/gig-gateway";
import {
  GIG_CATEGORIES,
  GIG_CATEGORY_LABELS,
  GIG_WORK_MODES,
  GigDraftFormSchema,
  type GigCategory,
  type GigDraftFormInput,
  type GigWorkMode,
} from "../model/gig-schemas";

type GigFormScreenProps = Readonly<{
  gateway?: GigGateway;
  draftStore?: GigDraftStore;
}>;

export function GigFormScreen({
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

  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedDraftNotice, setSavedDraftNotice] = useState(false);

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
    };
  }

  async function handleSaveDraft() {
    setErrorMessage(null);
    try {
      await draftStore.save(userId, {
        title,
        description,
        category,
        workMode,
        publicArea: workMode === "remote" ? null : publicArea,
        budgetAmount: Number(budgetAmount) || 0,
        currency: "PHP",
      });
      setSavedDraftNotice(true);
      setTimeout(() => setSavedDraftNotice(false), 3000);
    } catch {
      setErrorMessage("Could not preserve local draft.");
    }
  }

  async function handlePublish() {
    setErrorMessage(null);
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
      const createdDraft = await gateway.createDraft(
        parsed.data as GigDraftFormInput,
        userId,
      );
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
        <Text style={styles.headerTitle}>POST A GIG</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.aiNoticeCard}>
          <View style={styles.aiBadgeRow}>
            <Text style={styles.aiBadge}>AI JOB BRIEF BUILDER</Text>
            <Text style={styles.aiStatusPill}>COMING IN M10</Text>
          </View>
          <Text style={styles.aiBody}>
            Automated brief authoring with zero external compute costs arrives
            in milestone 10. Manual entry is fully operational.
          </Text>
        </View>

        {errorMessage ? (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <Text style={styles.errorTitle}>CANNOT POST NOTICE</Text>
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

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>WHAT NEEDS DOING?</Text>
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
                  style={[styles.pill, selected ? styles.pillSelected : null]}
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
                  style={[styles.pill, selected ? styles.pillSelected : null]}
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
            <Text style={styles.label}>NEIGHBORHOOD AREA</Text>
            <TextInput
              accessibilityLabel="Neighborhood Area"
              onChangeText={setPublicArea}
              placeholder="e.g. Poblacion, Makati"
              placeholderTextColor={setupTheme.color.muted}
              style={styles.input}
              value={publicArea}
            />
            <Text style={styles.hint}>
              Keep this general (e.g. barangay or district). Exact coordinates
              are never made public.
            </Text>
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>BUDGET (PHP)</Text>
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

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>DETAILED INSTRUCTIONS</Text>
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

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void handleSaveDraft()}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Save draft</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void handlePublish()}
            style={styles.primaryButton}
          >
            {busy ? (
              <ActivityIndicator color={setupTheme.color.foreground} />
            ) : (
              <Text style={styles.primaryButtonText}>Post notice</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: setupTheme.color.background,
    flex: 1,
  },
  topBar: {
    alignItems: "center",
    borderBottomColor: setupTheme.color.border,
    borderBottomWidth: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: setupTheme.spacing.section,
    paddingVertical: setupTheme.spacing.compact,
  },
  backButton: {
    paddingVertical: setupTheme.spacing.compact,
  },
  backButtonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
  headerTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  content: {
    gap: setupTheme.spacing.content,
    padding: setupTheme.spacing.section,
    paddingBottom: setupTheme.spacing.generous,
  },
  aiNoticeCard: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.card,
    borderWidth: 1,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  aiBadgeRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  aiBadge: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  aiStatusPill: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    color: setupTheme.color.foreground,
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 2,
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
    borderWidth: 2,
    gap: setupTheme.spacing.tight,
    padding: setupTheme.spacing.section,
  },
  errorTitle: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
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
    fontWeight: "800",
  },
  fieldGroup: {
    gap: setupTheme.spacing.compact,
  },
  label: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
    minHeight: 52,
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
    fontWeight: "800",
  },
  pillTextSelected: {
    color: setupTheme.color.surface,
  },
  actionRow: {
    flexDirection: "row",
    gap: setupTheme.spacing.section,
    marginTop: setupTheme.spacing.compact,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  secondaryButtonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.highlight,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    flex: 2,
    justifyContent: "center",
    minHeight: 52,
  },
  primaryButtonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
});
