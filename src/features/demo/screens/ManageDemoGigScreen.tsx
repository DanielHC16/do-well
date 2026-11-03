import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DemoShell, demoStyles } from "@/features/demo/components/DemoShell";
import { useDemo } from "@/features/demo/context/useDemo";
import { DEMO_WORKER } from "@/features/demo/model/demo-state";
import { setupTheme } from "@/features/setup/setupTheme";

export function ManageDemoGigScreen({ gigId }: Readonly<{ gigId: string }>) {
  const router = useRouter();
  const { busy, error, selectApplication, state } = useDemo();
  const gig = state.gigs.find((item) => item.id === gigId);
  const applications = state.applications.filter(
    (item) => item.gigId === gigId,
  );
  const assignment = state.assignments.find((item) => item.gigId === gigId);

  if (!gig) {
    return <Unavailable message="This gig is no longer available." />;
  }
  if (state.activePersona !== "employer") {
    return (
      <Unavailable message="Application messages are visible only to the employer account." />
    );
  }

  return (
    <DemoShell
      busy={busy}
      error={error}
      subtitle={`${gig.category} · PHP ${gig.budgetAmount.toLocaleString("en-PH")}`}
      title={gig.title}
    >
      <View style={demoStyles.card}>
        <Text style={demoStyles.statusPill}>{gig.status}</Text>
        <Text style={demoStyles.mutedText}>{gig.description}</Text>
      </View>

      <View style={styles.section}>
        <Text style={demoStyles.sectionTitle}>Applications</Text>
        {applications.length === 0 ? (
          <View style={demoStyles.card}>
            <Text style={styles.cardTitle}>No applications yet</Text>
            <Text style={demoStyles.mutedText}>
              New applications will appear here.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Post a gig"
              disabled={busy}
              onPress={() => router.push("/(demo)/employer/gigs/new")}
              style={demoStyles.secondaryButton}
            >
              <Text style={demoStyles.secondaryButtonText}>Post a gig</Text>
            </Pressable>
          </View>
        ) : (
          applications.map((application) => (
            <View key={application.id} style={demoStyles.card}>
              <Text style={styles.applicantKicker}>APPLICANT</Text>
              <Text style={styles.cardTitle}>{DEMO_WORKER.displayName}</Text>
              <Text style={demoStyles.statusPill}>{application.status}</Text>
              <Text style={demoStyles.mutedText}>{application.message}</Text>
              {!assignment && application.status === "pending" ? (
                <Pressable
                  accessibilityLabel={`Select ${DEMO_WORKER.displayName}`}
                  accessibilityRole="button"
                  accessibilityState={{ busy, disabled: busy }}
                  disabled={busy}
                  onPress={() => void selectApplication(application.id)}
                  style={[
                    demoStyles.button,
                    busy ? demoStyles.buttonDisabled : null,
                  ]}
                >
                  <Text style={demoStyles.buttonText}>
                    {busy ? "Selecting..." : "Select worker"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </View>

      {assignment ? (
        <View style={demoStyles.card}>
          <Text style={styles.cardTitle}>Assignment {assignment.status}</Text>
          <Text style={demoStyles.mutedText}>
            Open the assignment to review the work and its progress.
          </Text>
          <Pressable
            accessibilityLabel="Open assignment"
            accessibilityRole="button"
            onPress={() => router.push(`/(demo)/assignments/${assignment.id}`)}
            style={demoStyles.button}
          >
            <Text style={demoStyles.buttonText}>Open assignment</Text>
          </Pressable>
        </View>
      ) : null}
    </DemoShell>
  );
}

function Unavailable({ message }: Readonly<{ message: string }>) {
  const router = useRouter();
  return (
    <DemoShell subtitle={message} title="Employer view unavailable">
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
  section: { gap: setupTheme.spacing.section },
  applicantKicker: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  cardTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
});
