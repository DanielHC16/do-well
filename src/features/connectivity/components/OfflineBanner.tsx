import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useConnectivity } from "../context/ConnectivityProvider";

export interface OfflineBannerProps {
  onRetry?: () => void;
}

export function OfflineBanner({ onRetry }: OfflineBannerProps) {
  const { isOffline, refreshNetworkState } = useConnectivity();

  if (!isOffline) {
    return null;
  }

  const handlePressRetry = () => {
    void refreshNetworkState();
    onRetry?.();
  };

  return (
    <View
      accessibilityLabel="Offline notice: Device is currently offline. Showing saved information."
      accessibilityRole="alert"
      style={styles.banner}
    >
      <View style={styles.textContainer}>
        <Text style={styles.title}>OFFLINE MODE</Text>
        <Text style={styles.description}>
          Showing saved snapshot. Actions are drafted locally until reconnected.
        </Text>
      </View>
      <TouchableOpacity
        accessibilityHint="Checks network connection again"
        accessibilityLabel="Retry network connection"
        accessibilityRole="button"
        onPress={handlePressRetry}
        style={styles.retryButton}
      >
        <Text style={styles.retryButtonText}>RETRY</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#FEF3C7",
    borderBottomColor: "#F59E0B",
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: "#92400E",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  description: {
    color: "#78350F",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  retryButton: {
    backgroundColor: "#F59E0B",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
