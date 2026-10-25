import { SafeAreaView, StyleSheet } from "react-native";

import { MyReportsScreen } from "@/features/reports/screens/MyReportsScreen";
import { setupTheme } from "@/features/setup/setupTheme";

export default function ReportsRoute() {
  return (
    <SafeAreaView style={styles.screen}>
      <MyReportsScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: setupTheme.color.background,
    flex: 1,
  },
});
