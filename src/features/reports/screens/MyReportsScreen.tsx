import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { setupTheme } from "../../setup/setupTheme";
import { type Report, type ReportStatus } from "../model/report-schemas";
import { getReportGateway, type ReportGateway } from "../data/report-gateway";

const categoryLabels: Record<string, string> = {
  scam: "Scam or fraudulent activity",
  unsafe: "Unsafe working conditions",
  harassment: "Harassment or inappropriate behavior",
  prohibited: "Prohibited services",
  other: "Other issue",
};

const statusLabels: Record<
  ReportStatus,
  { label: string; badgeStyle: string }
> = {
  open: { label: "In queue", badgeStyle: "badgeOpen" },
  reviewing: { label: "Under review", badgeStyle: "badgeReviewing" },
  resolved: { label: "Resolved", badgeStyle: "badgeResolved" },
  dismissed: { label: "Dismissed", badgeStyle: "badgeDismissed" },
};

export type MyReportsScreenProps = Readonly<{
  gateway?: ReportGateway;
  onSelectReport?: (report: Report) => void;
}>;

export function MyReportsScreen({
  gateway = getReportGateway(),
  onSelectReport,
}: MyReportsScreenProps) {
  const [reports, setReports] = useState<readonly Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    gateway
      .listMyReports()
      .then((data) => {
        if (mounted) {
          setReports(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Failed to load reports.");
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [gateway, reloadIndex]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadIndex((prev) => prev + 1);
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={setupTheme.color.accent} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorHeading}>{error}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={handleRetry}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (reports.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No reports filed</Text>
        <Text style={styles.emptyBody}>
          You have not submitted any issue reports.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My filed reports</Text>
        <Text style={styles.headerSubtitle}>
          Track the status of incidents you reported to moderation.
        </Text>
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const statusConfig = statusLabels[item.status];
          const categoryName = categoryLabels[item.category] ?? item.category;
          return (
            <Pressable
              accessibilityRole={onSelectReport ? "button" : "none"}
              onPress={() => onSelectReport?.(item)}
              style={styles.card}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.categoryName}>{categoryName}</Text>
                <View
                  style={[
                    styles.badge,
                    item.status === "open" && styles.badgeOpen,
                    item.status === "reviewing" && styles.badgeReviewing,
                    item.status === "resolved" && styles.badgeResolved,
                    item.status === "dismissed" && styles.badgeDismissed,
                  ]}
                >
                  <Text style={styles.badgeText}>{statusConfig.label}</Text>
                </View>
              </View>

              <Text numberOfLines={3} style={styles.details}>
                {item.details}
              </Text>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  Filed {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                {item.gigId && (
                  <Text style={styles.metaText}>Gig reference</Text>
                )}
                {item.assignmentId && (
                  <Text style={styles.metaText}>Assignment reference</Text>
                )}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: setupTheme.color.background,
    flex: 1,
    padding: setupTheme.spacing.content,
  },
  header: {
    marginBottom: setupTheme.spacing.section,
  },
  headerTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    marginTop: 4,
  },
  listContent: {
    gap: setupTheme.spacing.compact,
    paddingBottom: setupTheme.spacing.content,
  },
  card: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    padding: setupTheme.spacing.section,
  },
  cardTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: setupTheme.spacing.compact,
  },
  categoryName: {
    color: setupTheme.color.foreground,
    flex: 1,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
    marginRight: setupTheme.spacing.compact,
  },
  badge: {
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    paddingHorizontal: setupTheme.spacing.compact,
    paddingVertical: setupTheme.spacing.tight,
  },
  badgeOpen: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
  },
  badgeReviewing: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.highlight,
  },
  badgeResolved: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
  },
  badgeDismissed: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
  },
  badgeText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
  },
  details: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    lineHeight: 20,
    marginBottom: setupTheme.spacing.compact,
  },
  metaRow: {
    borderTopColor: setupTheme.color.borderSoft,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: setupTheme.spacing.tight,
  },
  metaText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
  },
  centered: {
    alignItems: "center",
    backgroundColor: setupTheme.color.background,
    flex: 1,
    justifyContent: "center",
    padding: setupTheme.spacing.generous,
  },
  emptyTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
    marginBottom: setupTheme.spacing.compact,
  },
  emptyBody: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    textAlign: "center",
  },
  errorHeading: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
    marginBottom: setupTheme.spacing.section,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: setupTheme.color.accent,
    borderRadius: setupTheme.radius.control,
    paddingHorizontal: setupTheme.spacing.generous,
    paddingVertical: setupTheme.spacing.compact,
  },
  retryButtonText: {
    color: setupTheme.color.surface,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
});
