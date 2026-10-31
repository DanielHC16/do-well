import type { PropsWithChildren, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { palette, size, space } from "@/theme";

/**
 * Edge-to-edge screen on `bg`. The header slot draws behind the status bar (it
 * pads itself with the top inset); content gets 20dp padding and room for the
 * tab bar. Pass `scroll={false}` when the body is a FlatList.
 */
export function Screen({
  header,
  footer,
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  bottomInset = true,
}: PropsWithChildren<
  Readonly<{
    header?: ReactNode;
    /** Sticky bottom action (e.g. Apply), rendered above the safe area. */
    footer?: ReactNode;
    scroll?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
    /** Reserve space for the tab bar + gesture area. */
    bottomInset?: boolean;
  }>
>) {
  const insets = useSafeAreaInsets();
  const paddingBottom =
    (bottomInset ? size.tabBar + insets.bottom : 0) + space.xl;
  return (
    <KeyboardAvoidingView style={styles.root} behavior="height">
      {header}
      {scroll ? (
        <ScrollView
          style={styles.root}
          contentContainerStyle={[styles.content, { paddingBottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[palette.purple]}
                progressBackgroundColor={palette.surface}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.root}>{children}</View>
      )}
      {footer ? (
        <View
          style={[styles.footer, { paddingBottom: insets.bottom + space.sm }]}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

/** Content padding for FlatList-based screens, matching `Screen`. */
export const screenContentStyle = {
  paddingHorizontal: size.screenPadding,
  paddingTop: space.lg,
  gap: space.md,
} as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: {
    ...screenContentStyle,
    width: "100%",
    maxWidth: size.contentMax,
    alignSelf: "center",
  },
  footer: {
    paddingHorizontal: size.screenPadding,
    paddingTop: space.sm,
    backgroundColor: palette.surface,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
});
