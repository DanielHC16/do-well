import { StyleSheet, Text, View } from "react-native";

export interface StaleDataBadgeProps {
  cachedAt?: string | null;
  label?: string;
}

function formatRelativeTime(isoString?: string | null): string {
  if (!isoString) return "Saved snapshot";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Saved snapshot";
    return `Saved snapshot: ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return "Saved snapshot";
  }
}

export function StaleDataBadge({ cachedAt, label }: StaleDataBadgeProps) {
  const displayText = label ?? formatRelativeTime(cachedAt);

  return (
    <View
      accessibilityLabel={`Stale data warning: ${displayText}`}
      accessibilityRole="text"
      style={styles.container}
    >
      <View style={styles.dot} />
      <Text style={styles.text}>{displayText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    backgroundColor: "#D97706",
    borderRadius: 3,
    height: 6,
    marginRight: 6,
    width: 6,
  },
  text: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "500",
  },
});
