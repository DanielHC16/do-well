import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

import { CreateReportScreen } from "@/features/reports/screens/CreateReportScreen";
import { setupTheme } from "@/features/setup/setupTheme";

export default function NewReportRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    targetType?: string;
    targetId?: string;
    targetTitle?: string;
  }>();

  const targetType = params.targetType;
  const targetId = params.targetId;
  const targetTitle = params.targetTitle;

  if (
    !targetId ||
    !targetType ||
    !["gig", "profile", "assignment"].includes(targetType)
  ) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Invalid report parameters. Please report an issue from a specific
            gig, assignment, or user profile.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <CreateReportScreen
        onCancel={() => router.back()}
        onSuccess={() => router.replace("/(protected)/reports")}
        targetId={targetId}
        targetTitle={targetTitle}
        targetType={targetType as "gig" | "profile" | "assignment"}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: setupTheme.color.background,
    flex: 1,
  },
  errorContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: setupTheme.spacing.generous,
  },
  errorText: {
    color: setupTheme.color.danger,
    fontSize: setupTheme.type.body,
    textAlign: "center",
  },
});
