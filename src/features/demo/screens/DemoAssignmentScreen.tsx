import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { z } from "zod";

import { DemoShell, demoStyles } from "@/features/demo/components/DemoShell";
import { useDemo } from "@/features/demo/context/useDemo";
import { setupTheme } from "@/features/setup/setupTheme";

const submissionSchema = z
  .string()
  .trim()
  .min(10, "Describe the completed work in at least 10 characters.")
  .max(1_000, "Keep the work note under 1,000 characters.");

export function DemoAssignmentScreen({
  assignmentId,
}: Readonly<{ assignmentId: string }>) {
  const router = useRouter();
  const { approveAssignment, busy, error, state, submitAssignment } = useDemo();
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const submissionLock = useRef(false);
  const assignment = state.assignments.find((item) => item.id === assignmentId);
  const gig = state.gigs.find((item) => item.id === assignment?.gigId);
  const activity = state.activity.filter(
    (item) =>
      item.assignmentId === assignmentId || item.gigId === assignment?.gigId,
  );

  async function submit() {
    if (submissionLock.current || busy) return;
    const parsed = submissionSchema.safeParse(note);
    if (!parsed.success) {
      setNoteError(
        parsed.error.issues[0]?.message ?? "Enter a valid work note.",
      );
      return;
    }
    submissionLock.current = true;
    setNoteError(null);
    try {
      await submitAssignment(assignmentId, parsed.data);
    } finally {
      submissionLock.current = false;
    }
  }

  if (!assignment || !gig) {
    return (
      <DemoShell
        subtitle="This assignment is no longer available."
        title="Assignment unavailable"
      >
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

  const isWorker = state.activePersona === "worker";

  return (
    <DemoShell
      busy={busy}
      error={error}
      subtitle={`${isWorker ? "Worker" : "Employer"} workspace · ${gig.title}`}
      title="Your assignment"
    >
      <View style={demoStyles.card}>
        <Text style={styles.cardTitle}>{gig.title}</Text>
        <Text style={demoStyles.statusPill}>{assignment.status}</Text>
        <Text style={demoStyles.mutedText}>
          Follow the work from acceptance to completion.
        </Text>
      </View>

      {assignment.status === "active" && isWorker ? (
        <View style={styles.section}>
          <Text style={demoStyles.sectionTitle}>Submit completed work</Text>
          <Text style={demoStyles.label}>Work note</Text>
          <TextInput
            accessibilityLabel="Work note"
            editable={!busy}
            maxLength={1_000}
            multiline
            onChangeText={setNote}
            placeholder="Summarize what you completed for the employer."
            style={[
              demoStyles.input,
              styles.noteInput,
              noteError ? demoStyles.inputError : null,
            ]}
            textAlignVertical="top"
            value={note}
          />
          <Text style={styles.counter}>{note.length}/1000</Text>
          {noteError ? (
            <Text accessibilityRole="alert" style={demoStyles.errorText}>
              {noteError}
            </Text>
          ) : null}
          <Pressable
            accessibilityLabel={busy ? "Submitting work" : "Submit work"}
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: busy }}
            disabled={busy}
            onPress={() => void submit()}
            style={[demoStyles.button, busy ? demoStyles.buttonDisabled : null]}
          >
            <Text style={demoStyles.buttonText}>
              {busy ? "Submitting..." : "Submit work"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {assignment.status === "active" && !isWorker ? (
        <View style={demoStyles.card}>
          <Text style={styles.cardTitle}>Waiting for the worker</Text>
          <Text style={demoStyles.mutedText}>
            The worker is preparing their completed work.
          </Text>
        </View>
      ) : null}

      {assignment.submissionNote ? (
        <View style={demoStyles.card}>
          <Text style={styles.cardTitle}>Submitted work note</Text>
          <Text style={demoStyles.mutedText}>{assignment.submissionNote}</Text>
        </View>
      ) : null}

      {assignment.status === "submitted" && !isWorker ? (
        <Pressable
          accessibilityLabel={
            busy ? "Approving work" : "Approve completed work"
          }
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: busy }}
          disabled={busy}
          onPress={() => void approveAssignment(assignment.id)}
          style={[demoStyles.button, busy ? demoStyles.buttonDisabled : null]}
        >
          <Text style={demoStyles.buttonText}>
            {busy ? "Approving..." : "Approve completed work"}
          </Text>
        </Pressable>
      ) : null}

      {assignment.status === "submitted" && isWorker ? (
        <View style={demoStyles.card}>
          <Text style={styles.cardTitle}>Waiting for employer approval</Text>
          <Text style={demoStyles.mutedText}>
            Your completed work is ready for the employer to review.
          </Text>
        </View>
      ) : null}

      {assignment.status === "completed" ? (
        <View accessibilityRole="summary" style={styles.completedCard}>
          <Text style={styles.completedTitle}>Work completed</Text>
          <Text style={demoStyles.mutedText}>
            The employer approved the completed work. Great job!
          </Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={demoStyles.sectionTitle}>Activity timeline</Text>
        {activity.map((item, index) => (
          <View key={item.id} style={styles.timelineItem}>
            <Text style={styles.timelineNumber}>{index + 1}</Text>
            <View style={styles.timelineCopy}>
              <Text style={styles.timelineSummary}>{item.summary}</Text>
              <Text style={styles.timelineMeta}>
                {item.actor === "employer" ? "Employer" : "Worker"}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </DemoShell>
  );
}

const styles = StyleSheet.create({
  section: { gap: setupTheme.spacing.compact },
  cardTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  noteInput: { minHeight: 130 },
  counter: {
    alignSelf: "flex-end",
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
  },
  completedCard: {
    backgroundColor: setupTheme.color.readySurface,
    borderRadius: setupTheme.radius.card,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  completedTitle: {
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.heading,
    fontWeight: "800",
  },
  timelineItem: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
  },
  timelineNumber: {
    backgroundColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.status,
    color: setupTheme.color.surface,
    fontWeight: "700",
    height: 26,
    lineHeight: 26,
    textAlign: "center",
    width: 26,
  },
  timelineCopy: { flex: 1, gap: setupTheme.spacing.tight },
  timelineSummary: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
  },
  timelineMeta: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
  },
});
