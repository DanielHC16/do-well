import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { z } from "zod";

import { DemoShell, demoStyles } from "@/features/demo/components/DemoShell";
import { useDemo } from "@/features/demo/context/useDemo";
import { setupTheme } from "@/features/setup/setupTheme";

const applicationSchema = z
  .string()
  .trim()
  .min(10, "Write at least 10 characters.")
  .max(500, "Keep your message under 500 characters.");

export function DemoGigDetailScreen({ gigId }: Readonly<{ gigId: string }>) {
  const router = useRouter();
  const { applyToGig, busy, error, state } = useDemo();
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState<string | null>(null);
  const submissionLock = useRef(false);
  const gig = state.gigs.find((item) => item.id === gigId);
  const existingApplication = state.applications.find(
    (application) => application.gigId === gigId,
  );

  async function apply() {
    if (submissionLock.current || busy) return;
    const parsed = applicationSchema.safeParse(message);
    if (!parsed.success) {
      setMessageError(
        parsed.error.issues[0]?.message ?? "Enter a valid message.",
      );
      return;
    }
    submissionLock.current = true;
    setMessageError(null);
    try {
      await applyToGig(gigId, parsed.data);
    } finally {
      submissionLock.current = false;
    }
  }

  if (!gig) {
    return <NotAvailable message="This gig is no longer available." />;
  }
  if (state.activePersona !== "worker") {
    return (
      <NotAvailable message="Open Settings and switch to a worker account to apply." />
    );
  }

  return (
    <DemoShell
      busy={busy}
      error={error}
      subtitle={`${gig.category} · ${gig.workMode === "remote" ? "Remote" : gig.publicArea}`}
      title={gig.title}
    >
      <View style={demoStyles.card}>
        <Text style={demoStyles.statusPill}>{gig.status}</Text>
        <Text style={styles.budget}>
          PHP {gig.budgetAmount.toLocaleString("en-PH")}
        </Text>
        <Text style={demoStyles.mutedText}>{gig.description}</Text>
      </View>

      <View style={styles.recommendation}>
        <Text style={styles.recommendationTitle}>Why this may fit</Text>
        <Text style={demoStyles.mutedText}>
          {gig.workMode === "remote"
            ? "Remote work can be completed from the worker's current area."
            : `This gig is publicly listed in ${gig.publicArea}.`}
        </Text>
      </View>

      {existingApplication ? (
        <View accessibilityRole="summary" style={demoStyles.card}>
          <Text style={styles.cardTitle}>
            {existingApplication.status === "accepted"
              ? "You got the job"
              : "Application sent"}
          </Text>
          <Text style={demoStyles.mutedText}>
            Your application is {existingApplication.status}.
          </Text>
          {existingApplication.status === "accepted" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const assignment = state.assignments.find(
                  (item) => item.gigId === gig.id,
                );
                if (assignment)
                  router.push(`/(demo)/assignments/${assignment.id}`);
              }}
              style={demoStyles.button}
            >
              <Text style={demoStyles.buttonText}>Open assignment</Text>
            </Pressable>
          ) : null}
        </View>
      ) : gig.status !== "published" ? (
        <View style={demoStyles.card}>
          <Text style={styles.cardTitle}>Applications are closed</Text>
          <Text style={demoStyles.mutedText}>
            The employer has already selected a worker for this gig.
          </Text>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={demoStyles.sectionTitle}>Apply for this gig</Text>
          <Text style={demoStyles.label}>Message to the employer</Text>
          <TextInput
            accessibilityLabel="Message to the employer"
            editable={!busy}
            maxLength={500}
            multiline
            onChangeText={setMessage}
            placeholder="Briefly explain how you can help."
            style={[
              demoStyles.input,
              styles.messageInput,
              messageError ? demoStyles.inputError : null,
            ]}
            textAlignVertical="top"
            value={message}
          />
          <Text style={styles.counter}>{message.length}/500</Text>
          {messageError ? (
            <Text accessibilityRole="alert" style={demoStyles.errorText}>
              {messageError}
            </Text>
          ) : null}
          <Pressable
            accessibilityLabel={
              busy ? "Sending application" : "Send application"
            }
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: busy }}
            disabled={busy}
            onPress={() => void apply()}
            style={[demoStyles.button, busy ? demoStyles.buttonDisabled : null]}
          >
            <Text style={demoStyles.buttonText}>
              {busy ? "Sending..." : "Send application"}
            </Text>
          </Pressable>
        </View>
      )}
    </DemoShell>
  );
}

function NotAvailable({ message }: Readonly<{ message: string }>) {
  const router = useRouter();
  return (
    <DemoShell subtitle={message} title="Gig unavailable">
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace("/(demo)")}
        style={demoStyles.button}
      >
        <Text style={demoStyles.buttonText}>Back to home</Text>
      </Pressable>
    </DemoShell>
  );
}

const styles = StyleSheet.create({
  budget: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "800",
  },
  recommendation: {
    backgroundColor: setupTheme.color.accentSurface,
    borderRadius: setupTheme.radius.card,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  recommendationTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  cardTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  form: { gap: setupTheme.spacing.compact },
  messageInput: { minHeight: 120 },
  counter: {
    alignSelf: "flex-end",
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
  },
});
