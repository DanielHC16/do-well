import { useRouter } from "expo-router";
import { useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { z } from "zod";

import { DemoShell, demoStyles } from "@/features/demo/components/DemoShell";
import { useDemo } from "@/features/demo/context/useDemo";
import { setupTheme } from "@/features/setup/setupTheme";

const createGigFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Enter a title with at least 3 characters.")
      .max(80),
    description: z
      .string()
      .trim()
      .min(10, "Describe the work in at least 10 characters.")
      .max(500),
    category: z.string().trim().min(2, "Enter a category."),
    workMode: z.enum(["onsite", "remote"]),
    publicArea: z.string().trim().max(80),
    budgetAmount: z.coerce
      .number()
      .positive("Enter a budget above PHP 0.")
      .max(1_000_000),
  })
  .superRefine((value, context) => {
    if (value.workMode === "onsite" && value.publicArea.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["publicArea"],
        message: "Enter a public area for onsite work.",
      });
    }
  });

type FieldErrors = Partial<
  Record<
    "title" | "description" | "category" | "publicArea" | "budgetAmount",
    string
  >
>;

export function CreateDemoGigScreen() {
  const router = useRouter();
  const { busy, createGig, error, state } = useDemo();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [workMode, setWorkMode] = useState<"onsite" | "remote">("onsite");
  const [publicArea, setPublicArea] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const submissionLock = useRef(false);

  async function submit() {
    if (submissionLock.current || busy) return;
    const parsed = createGigFormSchema.safeParse({
      title,
      description,
      category,
      workMode,
      publicArea,
      budgetAmount,
    });
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        title: errors.title?.[0],
        description: errors.description?.[0],
        category: errors.category?.[0],
        publicArea: errors.publicArea?.[0],
        budgetAmount: errors.budgetAmount?.[0],
      });
      return;
    }
    submissionLock.current = true;
    setFieldErrors({});
    try {
      const saved = await createGig({
        ...parsed.data,
        publicArea:
          parsed.data.workMode === "remote" ? null : parsed.data.publicArea,
      });
      if (saved) router.replace("/(demo)");
    } finally {
      submissionLock.current = false;
    }
  }

  if (state.activePersona !== "employer") {
    return (
      <DemoShell
        title="Employer action"
        subtitle="Switch to the employer presenter to post a gig."
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(demo)")}
          style={demoStyles.button}
        >
          <Text style={demoStyles.buttonText}>Back to demo home</Text>
        </Pressable>
      </DemoShell>
    );
  }

  return (
    <DemoShell
      busy={busy}
      error={error}
      subtitle="Publish a local synthetic listing for the worker presenter."
      title="Post a demo gig"
    >
      <View style={styles.form}>
        <DemoField error={fieldErrors.title} label="Gig title">
          <TextInput
            accessibilityLabel="Gig title"
            editable={!busy}
            maxLength={80}
            onChangeText={setTitle}
            style={[
              demoStyles.input,
              fieldErrors.title ? demoStyles.inputError : null,
            ]}
            value={title}
          />
        </DemoField>
        <DemoField error={fieldErrors.description} label="Description">
          <TextInput
            accessibilityLabel="Description"
            editable={!busy}
            maxLength={500}
            multiline
            onChangeText={setDescription}
            style={[
              demoStyles.input,
              styles.multiline,
              fieldErrors.description ? demoStyles.inputError : null,
            ]}
            textAlignVertical="top"
            value={description}
          />
        </DemoField>
        <DemoField error={fieldErrors.category} label="Category">
          <TextInput
            accessibilityLabel="Category"
            editable={!busy}
            maxLength={50}
            onChangeText={setCategory}
            placeholder="e.g. Home services"
            style={[
              demoStyles.input,
              fieldErrors.category ? demoStyles.inputError : null,
            ]}
            value={category}
          />
        </DemoField>
        <View style={demoStyles.field}>
          <Text style={demoStyles.label}>Work mode</Text>
          <View accessibilityRole="radiogroup" style={styles.modeRow}>
            {(["onsite", "remote"] as const).map((mode) => (
              <Pressable
                accessibilityLabel={mode === "onsite" ? "Onsite" : "Remote"}
                accessibilityRole="radio"
                accessibilityState={{ checked: workMode === mode }}
                disabled={busy}
                key={mode}
                onPress={() => setWorkMode(mode)}
                style={[
                  styles.modeButton,
                  workMode === mode ? styles.modeButtonActive : null,
                ]}
              >
                <Text
                  style={
                    workMode === mode ? styles.modeTextActive : styles.modeText
                  }
                >
                  {mode === "onsite" ? "Onsite" : "Remote"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        {workMode === "onsite" ? (
          <DemoField error={fieldErrors.publicArea} label="Public area">
            <TextInput
              accessibilityLabel="Public area"
              editable={!busy}
              maxLength={80}
              onChangeText={setPublicArea}
              placeholder="City or neighborhood, never a full address"
              style={[
                demoStyles.input,
                fieldErrors.publicArea ? demoStyles.inputError : null,
              ]}
              value={publicArea}
            />
          </DemoField>
        ) : null}
        <DemoField error={fieldErrors.budgetAmount} label="Budget in PHP">
          <TextInput
            accessibilityLabel="Budget in PHP"
            editable={!busy}
            inputMode="decimal"
            onChangeText={setBudgetAmount}
            style={[
              demoStyles.input,
              fieldErrors.budgetAmount ? demoStyles.inputError : null,
            ]}
            value={budgetAmount}
          />
        </DemoField>
        <Pressable
          accessibilityLabel={
            busy ? "Publishing gig" : "Create and publish gig"
          }
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: busy }}
          disabled={busy}
          onPress={() => void submit()}
          style={[demoStyles.button, busy ? demoStyles.buttonDisabled : null]}
        >
          <Text style={demoStyles.buttonText}>
            {busy ? "Publishing..." : "Create and publish"}
          </Text>
        </Pressable>
      </View>
    </DemoShell>
  );
}

function DemoField({
  children,
  error,
  label,
}: Readonly<{ children: ReactNode; error?: string; label: string }>) {
  return (
    <View style={demoStyles.field}>
      <Text style={demoStyles.label}>{label}</Text>
      {children}
      {error ? (
        <Text accessibilityRole="alert" style={demoStyles.errorText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: setupTheme.spacing.section },
  multiline: { minHeight: 112 },
  modeRow: { flexDirection: "row", gap: setupTheme.spacing.compact },
  modeButton: {
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
  },
  modeButtonActive: {
    backgroundColor: setupTheme.color.foreground,
    borderColor: setupTheme.color.foreground,
  },
  modeText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
    textAlign: "center",
    textTransform: "capitalize",
  },
  modeTextActive: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "capitalize",
  },
});
