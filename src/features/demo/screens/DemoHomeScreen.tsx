import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DemoShell, demoStyles } from "@/features/demo/components/DemoShell";
import { useDemo } from "@/features/demo/context/useDemo";
import { DEMO_EMPLOYER, DEMO_WORKER } from "@/features/demo/model/demo-state";
import { setupTheme } from "@/features/setup/setupTheme";

function formatBudget(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function DemoHomeScreen() {
  const router = useRouter();
  const { busy, error, state } = useDemo();
  const isEmployer = state.activePersona === "employer";
  const persona = isEmployer ? DEMO_EMPLOYER : DEMO_WORKER;
  const visibleGigs = isEmployer
    ? state.gigs
    : state.gigs.filter((gig) => gig.status === "published");
  return (
    <DemoShell
      busy={busy}
      error={error}
      subtitle={
        isEmployer
          ? "Connect with people who can get it done."
          : "Good opportunities, right in your neighborhood."
      }
      title={isEmployer ? "Put good work out there." : "Find work worth doing."}
    >
      <View style={styles.personaCard}>
        <Text style={styles.eyebrow}>WELCOME BACK</Text>
        <Text accessibilityLiveRegion="polite" style={styles.personaName}>
          {persona.displayName}
        </Text>
        <Text style={styles.personaRole}>
          {isEmployer ? "Your hiring workspace" : "Your work workspace"}
        </Text>
      </View>

      {state.assignments.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.eyebrow}>YOUR WORK</Text>
          <Text style={demoStyles.sectionTitle}>Your assignments</Text>
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
                      : "Work completed"}
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
                ? "Post your first gig and find someone to help."
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
            Your recent activity will appear here.
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
    </DemoShell>
  );
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
  sectionLead: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: setupTheme.spacing.compact,
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
});
