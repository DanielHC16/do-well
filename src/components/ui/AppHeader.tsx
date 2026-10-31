import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { palette, radius, size, space } from "@/theme";

import { Avatar } from "./Avatar";
import { IconButton } from "./Buttons";
import { PressableScale } from "./PressableScale";
import { Txt } from "./Txt";

/**
 * The one app header: navy hero with rounded bottom corners. Draws behind the
 * status bar. `controls` hosts the mode switch; `children` hosts screen content
 * that belongs on navy (e.g. the Home stat tiles).
 */
export function AppHeader({
  name,
  greeting,
  screenName,
  onAvatarPress,
  onSearch,
  onNotifications,
  unread = false,
  controls,
  children,
  insetTop = true,
}: Readonly<{
  name: string;
  greeting?: string;
  screenName: string;
  onAvatarPress: () => void;
  /** Only on screens where search is meaningful. */
  onSearch?: () => void;
  onNotifications: () => void;
  /** Real unread activity only; never a placeholder. */
  unread?: boolean;
  controls?: ReactNode;
  children?: ReactNode;
  /** False when a fixed strip already covers the status bar (scrolling hero). */
  insetTop?: boolean;
}>) {
  const insets = useSafeAreaInsets();
  const firstName = name.trim().split(/\s+/)[0] || "there";
  return (
    <View
      style={[
        styles.header,
        { paddingTop: (insetTop ? insets.top : 0) + space.sm },
      ]}
      accessibilityRole="header"
    >
      <View style={styles.row}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Open your profile"
          onPress={onAvatarPress}
          rippleColor={palette.onDarkSubtle}
          style={styles.avatarButton}
        >
          <Avatar name={name} diameter={size.iconButton} ring />
        </PressableScale>
        <View style={styles.titles}>
          <Txt variant="caption" tone="onPrimaryMuted" numberOfLines={1}>
            {greeting ?? `Hi, ${firstName}`}
          </Txt>
          <Txt
            variant="h2"
            tone="onPrimary"
            numberOfLines={1}
            accessibilityRole="header"
          >
            {screenName}
          </Txt>
        </View>
        {onSearch ? (
          <IconButton
            icon="search"
            accessibilityLabel="Open search"
            onPress={onSearch}
          />
        ) : null}
        <IconButton
          icon="bell"
          accessibilityLabel="Notifications"
          onPress={onNotifications}
          badge={unread}
        />
      </View>
      {controls}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: palette.navy,
    borderBottomLeftRadius: radius.hero,
    borderBottomRightRadius: radius.hero,
    paddingHorizontal: size.screenPadding,
    paddingBottom: space.lg,
    gap: space.md,
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  avatarButton: { borderRadius: radius.pill, padding: 2 },
  titles: { flex: 1, minWidth: 0 },
});
