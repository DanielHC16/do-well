import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { DemoShell, demoStyles } from "@/features/demo/components/DemoShell";
import { useDemo } from "@/features/demo/context/useDemo";
import { DEMO_EMPLOYER, DEMO_WORKER } from "@/features/demo/model/demo-state";
import { setupTheme } from "@/features/setup/setupTheme";

const journey = ["Post", "Apply", "Select", "Submit", "Approve"] as const;

function formatBudget(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function DemoHomeScreen() {
  const router = useRouter();
  const { busy, error, reset, state, switchPersona } = useDemo();
  const isEmployer = state.activePersona === "employer";
  const persona = isEmployer ? DEMO_EMPLOYER : DEMO_WORKER;
  const visibleGigs = isEmployer
    ? state.gigs
    : state.gigs.filter((gig) => gig.status === "published");
  const journeyStep = getJourneyStep(state);

  function confirmReset() {
    Alert.alert(
      "Reset demo data?",
      "This replaces all local synthetic demo progress with the starting scenario.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: () => void reset() },
      ],
    );
  }

  return (
    <DemoShell
      busy={busy}
      error={error}
      subtitle="A working neighborhood marketplace, shown with fictional people and local sample data."
      title={isEmployer ? "Put good work out there." : "Find work worth doing."}
    >
      <View style={styles.personaCard}>
        <Text style={styles.eyebrow}>YOU ARE PRESENTING AS</Text>
        <Text accessibilityLiveRegion="polite" style={styles.personaName}>
          {persona.displayName}
        </Text>
        <Text style={styles.personaRole}>
          {isEmployer ? "Employer view" : "Worker view"}
        </Text>
        <View accessibilityRole="radiogroup" style={styles.personaButtons}>
          {(["employer", "worker"] as const).map((role) => {
            const active = state.activePersona === role;
            const label = `Present as ${role === "employer" ? "Employer" : "Worker"}`;
            return (
              <Pressable
                accessibilityLabel={label}
                accessibilityRole="radio"
                accessibilityState={{ checked: active, selected: active }}
                disabled={busy || active}
                key={role}
                onPress={() => void switchPersona(role)}
                style={[
                  styles.personaButton,
                  active ? styles.personaButtonActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.personaButtonText,
                    active ? styles.personaButtonTextActive : null,
                  ]}
                >
                  {role === "employer" ? "Maya · Employer" : "Alex · Worker"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.journeyCard}>
        <View style={styles.sectionLead}>
          <Text style={styles.eyebrow}>THE DEMO ROUTE</Text>
          <Text style={styles.routeCount}>{journeyStep}/5 complete</Text>
        </View>
        <View style={styles.journeyRow}>
          {journey.map((label, index) => {
            const complete = index < journeyStep;
            const current = index === journeyStep;
            return (
              <View key={label} style={styles.journeyStep}>
                <View
                  style={[
                    styles.journeyMark,
                    complete ? styles.journeyMarkDone : null,
                    current ? styles.journeyMarkCurrent : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.journeyNumber,
                      complete || current ? styles.journeyNumberActive : null,
                    ]}
                  >
                    {complete ? "✓" : index + 1}
                  </Text>
                </View>
                <Text style={styles.journeyLabel}>{label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {state.assignments.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.eyebrow}>ACTIVE HANDOFFS</Text>
          <Text style={demoStyles.sectionTitle}>
            {isEmployer ? "Work in progress" : "Your assignments"}
          </Text>
          {state.assignments.map((assignment) => {
            const gig = state.gigs.find((item) => item.id === assignment.gigId);
            if (!gig) return null;
            return (
              <Pressable
                accessibilityLabel={`Open assignment for ${gig.title}`}
                accessibilityRole="button"
                key={assignment.id}
                onPress={() =>
                  router.push(`/(demo)/assignments/${assignment.id}`)
                }
                style={styles.assignmentCard}
              >
                <View style={styles.assignmentTopline}>
                  <Text style={styles.assignmentState}>
                    {assignment.status}
                  </Text>
                  <Text style={styles.arrow}>→</Text>
                </View>
                <Text style={styles.assignmentTitle}>{gig.title}</Text>
                <Text style={styles.assignmentHint}>
                  {assignment.status === "active"
                    ? isEmployer
                      ? "Waiting for Alex's work note"
                      : "Ready for your work note"
                    : assignment.status === "submitted"
                      ? isEmployer
                        ? "Ready for your approval"
                        : "Waiting for Maya's approval"
                      : "Completed in this demo"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionLead}>
          <View>
            <Text style={styles.eyebrow}>
              {isEmployer ? "YOUR NOTICEBOARD" : "OPEN NEAR YOU"}
            </Text>
            <Text style={demoStyles.sectionTitle}>
              {isEmployer ? "Posted gigs" : "Available work"}
            </Text>
          </View>
          {isEmployer ? (
            <Pressable
              accessibilityLabel="Create and publish a gig"
              accessibilityRole="button"
              disabled={busy}
              onPress={() => router.push("/(demo)/employer/gigs/new")}
              style={styles.addButton}
            >
              <Text style={styles.addButtonText}>＋ POST</Text>
            </Pressable>
          ) : null}
        </View>

        {visibleGigs.length === 0 ? (
          <View style={demoStyles.card}>
            <Text style={styles.noticeIndex}>00</Text>
            <Text style={styles.cardTitle}>No gigs yet</Text>
            <Text style={demoStyles.mutedText}>
              {isEmployer
                ? "Put up the first notice to begin the demo."
                : "There are no open notices right now. Check your assignments above."}
            </Text>
            {isEmployer ? (
              <Pressable
                accessibilityLabel="Create and publish a gig"
                accessibilityRole="button"
                onPress={() => router.push("/(demo)/employer/gigs/new")}
                style={demoStyles.secondaryButton}
              >
                <Text style={demoStyles.secondaryButtonText}>
                  Post the first gig
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          visibleGigs.map((gig, index) => (
            <View key={gig.id} style={demoStyles.card}>
              <View style={styles.noticeTopline}>
                <Text style={styles.noticeIndex}>
                  {String(index + 1).padStart(2, "0")}
                </Text>
                <Text style={demoStyles.statusPill}>{gig.status}</Text>
              </View>
              <Text style={styles.cardTitle}>{gig.title}</Text>
              <Text style={styles.noticeMeta}>
                {gig.workMode === "remote"
                  ? "REMOTE"
                  : gig.publicArea?.toUpperCase()}{" "}
                · {formatBudget(gig.budgetAmount)}
              </Text>
              <Text numberOfLines={2} style={demoStyles.mutedText}>
                {gig.description}
              </Text>
              <Pressable
                accessibilityLabel={`${isEmployer ? "Manage" : "View"} ${gig.title}`}
                accessibilityRole="button"
                onPress={() =>
                  router.push(
                    isEmployer
                      ? `/(demo)/employer/gigs/${gig.id}`
                      : `/(demo)/gigs/${gig.id}`,
                  )
                }
                style={demoStyles.secondaryButton}
              >
                <Text style={demoStyles.secondaryButtonText}>
                  {isEmployer ? "Manage this gig" : "See the details"}
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View style={styles.activitySection}>
        <Text style={styles.eyebrow}>FIELD NOTES</Text>
        <Text style={demoStyles.sectionTitle}>What just happened</Text>
        {state.activity.length === 0 ? (
          <Text style={demoStyles.mutedText}>
            Your demo actions will collect here.
          </Text>
        ) : (
          [...state.activity]
            .reverse()
            .slice(0, 4)
            .map((item) => (
              <View key={item.id} style={styles.activityItem}>
                <View style={styles.activityDot} />
                <View style={styles.activityCopy}>
                  <Text style={styles.activitySummary}>{item.summary}</Text>
                  <Text style={styles.activityMeta}>
                    {item.actor === "employer"
                      ? "Maya · Employer"
                      : "Alex · Worker"}
                  </Text>
                </View>
              </View>
            ))
        )}
      </View>

      <View style={styles.disclosureCard}>
        <Text style={styles.eyebrow}>WHAT THIS PROVES</Text>
        <Text style={styles.disclosureTitle}>
          The flow is real. The people and data are not.
        </Text>
        <Text style={demoStyles.mutedText}>
          This preview runs gigs, applications, assignments, submissions, and
          approvals locally. It does not claim authentication, cloud sync,
          payments, identity checks, or AI.
        </Text>
      </View>

      <Pressable
        accessibilityLabel="Reset demo data"
        accessibilityRole="button"
        disabled={busy}
        onPress={confirmReset}
        style={styles.resetButton}
      >
        <Text style={styles.resetText}>Reset the local demo</Text>
      </Pressable>
    </DemoShell>
  );
}

function getJourneyStep(state: ReturnType<typeof useDemo>["state"]): number {
  if (state.assignments.some(({ status }) => status === "completed")) return 5;
  if (state.assignments.some(({ status }) => status === "submitted")) return 4;
  if (state.assignments.length > 0) return 3;
  if (state.applications.length > 0) return 2;
  if (state.gigs.length > 0) return 1;
  return 0;
}

const styles = StyleSheet.create({
  eyebrow: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 1,
  },
  personaCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.highlight,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  personaName: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.display,
    fontWeight: "900",
    letterSpacing: -1.5,
    lineHeight: 48,
  },
  personaRole: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  personaButtons: {
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    marginTop: setupTheme.spacing.compact,
  },
  personaButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
    padding: setupTheme.spacing.compact,
  },
  personaButtonActive: { backgroundColor: setupTheme.color.foreground },
  personaButtonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "800",
    textAlign: "center",
  },
  personaButtonTextActive: { color: setupTheme.color.surface },
  journeyCard: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.section,
    padding: setupTheme.spacing.section,
  },
  sectionLead: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: setupTheme.spacing.compact,
  },
  routeCount: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "800",
  },
  journeyRow: { flexDirection: "row", gap: setupTheme.spacing.tight },
  journeyStep: {
    alignItems: "center",
    flex: 1,
    gap: setupTheme.spacing.compact,
  },
  journeyMark: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  journeyMarkDone: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
  },
  journeyMarkCurrent: {
    backgroundColor: setupTheme.color.highlight,
    borderColor: setupTheme.color.foreground,
    borderWidth: 2,
  },
  journeyNumber: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "900",
  },
  journeyNumberActive: { color: setupTheme.color.foreground },
  journeyLabel: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
    textAlign: "center",
  },
  section: { gap: setupTheme.spacing.section },
  addButton: {
    backgroundColor: setupTheme.color.accent,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.status,
    borderWidth: 2,
    paddingHorizontal: setupTheme.spacing.section,
    paddingVertical: setupTheme.spacing.compact,
  },
  addButtonText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  assignmentCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.accentSurface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  assignmentTopline: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  assignmentState: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  arrow: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  assignmentTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  assignmentHint: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
  },
  noticeTopline: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  noticeIndex: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  cardTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  noticeMeta: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  activitySection: { gap: setupTheme.spacing.section },
  activityItem: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
  },
  activityDot: {
    backgroundColor: setupTheme.color.highlight,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.status,
    borderWidth: 2,
    height: 14,
    marginTop: setupTheme.spacing.tight,
    width: 14,
  },
  activityCopy: { flex: 1, gap: setupTheme.spacing.tight },
  activitySummary: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  activityMeta: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
  },
  disclosureCard: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  disclosureTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
    lineHeight: 28,
  },
  resetButton: {
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  resetText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
