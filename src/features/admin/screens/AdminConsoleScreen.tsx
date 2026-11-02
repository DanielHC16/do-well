import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { setupTheme } from "@/features/setup/setupTheme";
import {
  MarketplaceShell,
  marketplaceStyles,
} from "@/features/shell/components/MarketplaceShell";

export type AdminOverview = Readonly<{
  profiles: number;
  openReports: number;
  publishedGigs: number;
  activeAssignments: number;
}>;

export type AdminReportStatus = "open" | "resolved" | "dismissed";

export type AdminReport = Readonly<{
  id: string;
  reporterId: string;
  subjectProfileId: string | null;
  gigId: string | null;
  assignmentId: string | null;
  category: string;
  details: string;
  status: AdminReportStatus;
  resolutionNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}>;

export type AdminConsoleGateway = Readonly<{
  getAdminOverview: () => Promise<AdminOverview>;
  listAdminReports: () => Promise<AdminReport[]>;
  resolveReport: (
    reportId: string,
    decision: "resolved" | "dismissed",
    resolutionNote: string,
  ) => Promise<AdminReport>;
}>;

type AdminConsoleScreenProps = Readonly<{
  gateway: AdminConsoleGateway;
  isAdmin: boolean;
}>;

export function AdminConsoleScreen({
  gateway,
  isAdmin,
}: AdminConsoleScreenProps) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(isAdmin);
  const [loadError, setLoadError] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setLoadError(false);
    try {
      const [nextOverview, nextReports] = await Promise.all([
        gateway.getAdminOverview(),
        gateway.listAdminReports(),
      ]);
      setOverview(nextOverview);
      setReports(nextReports.filter((report) => report.status === "open"));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [gateway, isAdmin]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function decideReport(
    report: AdminReport,
    decision: "resolved" | "dismissed",
  ) {
    const normalizedNote = reviewNote.trim();
    if (
      normalizedNote.length < 10 ||
      normalizedNote.length > 2000 ||
      reviewingId
    )
      return;
    setReviewingId(report.id);
    setActionMessage(null);
    setActionError(null);
    try {
      await gateway.resolveReport(report.id, decision, normalizedNote);
      setReports((current) => current.filter((item) => item.id !== report.id));
      setOverview((current) =>
        current
          ? { ...current, openReports: Math.max(0, current.openReports - 1) }
          : current,
      );
      setReviewNote("");
      setActionMessage(
        decision === "resolved" ? "Report resolved." : "Report dismissed.",
      );
    } catch {
      setActionError("The moderation decision couldn't be saved. Try again.");
    } finally {
      setReviewingId(null);
    }
  }

  if (!isAdmin) {
    return (
      <MarketplaceShell
        activeSection="account"
        subtitle="This area is protected independently from marketplace workspace preferences."
        title="Admin access required"
      >
        <View style={styles.deniedCard}>
          <Text style={styles.deniedTitle}>AUTHORIZED STAFF ONLY</Text>
          <Text style={styles.deniedBody}>
            The Admin Console is available only to server-authorized
            administrators. Changing workspace does not grant access.
          </Text>
        </View>
      </MarketplaceShell>
    );
  }

  return (
    <MarketplaceShell
      activeSection="account"
      subtitle="Review current marketplace activity and resolve community reports with an auditable decision."
      title="Admin Console"
    >
      {loading ? (
        <View accessibilityLiveRegion="polite" style={styles.loadingCard}>
          <ActivityIndicator color={setupTheme.color.foreground} />
          <Text style={styles.loadingText}>
            Loading protected admin data...
          </Text>
        </View>
      ) : loadError ? (
        <View accessibilityRole="alert" style={styles.errorCard}>
          <Text style={styles.errorTitle}>ADMIN DATA UNAVAILABLE</Text>
          <Text style={styles.errorText}>
            Admin data couldn&apos;t be loaded. Check your connection and try
            again.
          </Text>
          <Pressable
            accessibilityLabel="Retry admin data"
            accessibilityRole="button"
            onPress={() => void load()}
            style={marketplaceStyles.primaryButton}
          >
            <Text style={marketplaceStyles.primaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : overview ? (
        <>
          <View style={styles.metricsGrid}>
            <Metric label="Members" value={overview.profiles} />
            <Metric label="Open reports" value={overview.openReports} />
            <Metric label="Published notices" value={overview.publishedGigs} />
            <Metric
              label="Active agreements"
              value={overview.activeAssignments}
            />
          </View>

          <View style={styles.queueHeading}>
            <Text style={styles.queueTitle}>Report queue</Text>
            <Text style={styles.queueCount}>{reports.length} OPEN</Text>
          </View>

          {actionMessage ? (
            <Text accessibilityLiveRegion="polite" style={styles.successText}>
              {actionMessage}
            </Text>
          ) : null}
          {actionError ? (
            <Text accessibilityRole="alert" style={styles.actionErrorText}>
              {actionError}
            </Text>
          ) : null}

          {reports.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No open reports</Text>
              <Text style={styles.emptyBody}>
                New community reports will appear here for review.
              </Text>
            </View>
          ) : (
            reports.map((report) => (
              <ReportCard
                busy={reviewingId === report.id}
                key={report.id}
                note={reviewNote}
                onDecision={(decision) => void decideReport(report, decision)}
                onNoteChange={setReviewNote}
                report={report}
              />
            ))
          )}
        </>
      ) : null}
    </MarketplaceShell>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ReportCard({
  busy,
  note,
  onDecision,
  onNoteChange,
  report,
}: Readonly<{
  busy: boolean;
  note: string;
  onDecision: (decision: "resolved" | "dismissed") => void;
  onNoteChange: (value: string) => void;
  report: AdminReport;
}>) {
  const decisionDisabled = busy || note.trim().length < 10;
  return (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <Text style={styles.reportCategory}>
          {report.category.replace(/_/g, " ").toUpperCase()}
        </Text>
        <Text style={styles.reportDate}>
          {new Date(report.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.reportDetails}>{report.details}</Text>
      <TextInput
        accessibilityLabel="Moderation note"
        editable={!busy}
        maxLength={1000}
        multiline
        onChangeText={onNoteChange}
        placeholder="Record what you reviewed and why you made this decision."
        placeholderTextColor={setupTheme.color.muted}
        style={styles.noteInput}
        value={note}
      />
      <View style={styles.actionRow}>
        <Pressable
          accessibilityLabel="Resolve report"
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: decisionDisabled }}
          disabled={decisionDisabled}
          onPress={() => onDecision("resolved")}
          style={[styles.resolveButton, decisionDisabled && styles.disabled]}
        >
          <Text style={styles.resolveText}>
            {busy ? "Saving..." : "Resolve"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Dismiss report"
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: decisionDisabled }}
          disabled={decisionDisabled}
          onPress={() => onDecision("dismissed")}
          style={[styles.dismissButton, decisionDisabled && styles.disabled]}
        >
          <Text style={styles.dismissText}>Dismiss</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  deniedCard: {
    backgroundColor: setupTheme.color.dangerSurface,
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  deniedTitle: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 1,
  },
  deniedBody: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 23,
  },
  loadingCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  loadingText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
  },
  errorCard: {
    backgroundColor: setupTheme.color.dangerSurface,
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  errorTitle: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
  },
  errorText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: setupTheme.spacing.compact,
  },
  metricCard: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    flexBasis: "47%",
    flexGrow: 1,
    gap: setupTheme.spacing.tight,
    padding: setupTheme.spacing.section,
  },
  metricValue: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.title,
    fontWeight: "900",
  },
  metricLabel: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "800",
  },
  queueHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  queueTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  queueCount: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
  },
  successText: {
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
  actionErrorText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    borderRadius: setupTheme.radius.card,
    borderWidth: 1,
    gap: setupTheme.spacing.tight,
    padding: setupTheme.spacing.section,
  },
  emptyTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  emptyBody: { color: setupTheme.color.muted, fontSize: setupTheme.type.body },
  reportCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  reportHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reportCategory: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  reportDate: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
  },
  reportDetails: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 22,
  },
  noteInput: {
    backgroundColor: setupTheme.color.background,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    minHeight: 88,
    padding: setupTheme.spacing.compact,
    textAlignVertical: "top",
  },
  actionRow: { flexDirection: "row", gap: setupTheme.spacing.compact },
  resolveButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  resolveText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
  dismissButton: {
    alignItems: "center",
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  dismissText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
  disabled: { opacity: 0.5 },
});
