import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon, type AppIconName } from "@/shared/ui/AppIcon";
import { elevation, palette, radius, size, space } from "@/theme";

import { PressableScale } from "./PressableScale";
import { Txt } from "./Txt";

export type TabKey = "home" | "work" | "activity" | "profile";

const TABS: readonly Readonly<{
  key: TabKey;
  label: string;
  icon: AppIconName;
}>[] = [
  { key: "home", label: "Home", icon: "home" },
  { key: "work", label: "My Work", icon: "briefcase" },
  { key: "activity", label: "Activity", icon: "bell" },
  { key: "profile", label: "Profile", icon: "user" },
];

/** White bottom bar: Home · My Work · [raised navy FAB] · Activity · Profile. */
export function TabBar({
  active,
  onNavigate,
  fabLabel,
  onFab,
}: Readonly<{
  active: TabKey | null;
  onNavigate: (tab: TabKey) => void;
  /** Accessible name for the center action ("Post a gig" / "Find gigs"). */
  fabLabel: string;
  onFab: () => void;
}>) {
  const insets = useSafeAreaInsets();
  const renderTab = (tab: (typeof TABS)[number]) => {
    const selected = active === tab.key;
    const color = selected ? palette.navy : palette.textSecondary;
    return (
      <Pressable
        key={tab.key}
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected }}
        onPress={() => onNavigate(tab.key)}
        android_ripple={{ color: palette.stripe, borderless: true }}
        style={styles.tab}
      >
        <View style={[styles.iconPill, selected && styles.iconPillActive]}>
          <AppIcon name={tab.icon} size={size.icon} color={color} />
        </View>
        <Txt
          variant="micro"
          numberOfLines={1}
          style={[styles.label, { color }, selected && styles.labelActive]}
        >
          {tab.label}
        </Txt>
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: insets.bottom }]}
    >
      {TABS.slice(0, 2).map(renderTab)}
      <View style={styles.fabSlot}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={fabLabel}
          onPress={onFab}
          rippleColor={palette.onDarkSubtle}
          containerStyle={styles.fabLift}
          style={styles.fab}
        >
          <AppIcon
            name="plus"
            size={size.icon + space.xs}
            color={palette.onPrimary}
          />
        </PressableScale>
      </View>
      {TABS.slice(2).map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: palette.surface,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingHorizontal: space.xs,
  },
  tab: {
    flex: 1,
    minHeight: size.tabBar,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  iconPill: {
    width: size.tabPill,
    height: size.tabPillHeight,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPillActive: { backgroundColor: palette.lavender },
  label: { textAlign: "center" },
  labelActive: { fontWeight: "600" },
  fabSlot: { width: size.fab + space.md, alignItems: "center" },
  fabLift: { marginTop: -size.fab / 3, borderRadius: radius.pill },
  fab: {
    width: size.fab,
    height: size.fab,
    borderRadius: radius.pill,
    backgroundColor: palette.navy,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: palette.surface,
    ...elevation.raised,
  },
});
