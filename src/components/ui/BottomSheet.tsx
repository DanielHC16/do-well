import {
  useEffect,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { motion, palette, radius, space } from "@/theme";

import { IconButton } from "./Buttons";
import { useReducedMotion } from "./motion";
import { Txt } from "./Txt";

/** Modal bottom sheet: scrim fades, sheet slides; Android back closes it. */
export function BottomSheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: PropsWithChildren<
  Readonly<{
    visible: boolean;
    title: string;
    onClose: () => void;
    /** Sticky actions pinned under the scrolling content. */
    footer?: ReactNode;
  }>
>) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const offset = useState(() => new Animated.Value(height))[0];

  useEffect(() => {
    if (!visible) return;
    if (reduced) {
      offset.setValue(0);
      return;
    }
    offset.setValue(height);
    Animated.timing(offset, {
      toValue: 0,
      duration: motion.base,
      useNativeDriver: true,
    }).start();
  }, [visible, reduced, height, offset]);

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType={reduced ? "none" : "fade"}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Close ${title}`}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.scrim} />
        </Pressable>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              maxHeight: height * 0.88,
              paddingBottom: insets.bottom + space.md,
              transform: [{ translateY: offset }],
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Txt variant="h2" accessibilityRole="header" style={styles.title}>
              {title}
            </Txt>
            <IconButton
              icon="close"
              variant="muted"
              accessibilityLabel={`Close ${title}`}
              onPress={onClose}
            />
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  scrim: { flex: 1, backgroundColor: palette.scrim },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    paddingTop: space.xs,
  },
  handle: {
    alignSelf: "center",
    width: space.xxl + space.xs,
    height: space.xxs,
    borderRadius: radius.pill,
    backgroundColor: palette.borderStrong,
    marginBottom: space.xs,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.xs,
  },
  title: { flex: 1 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    gap: space.md,
  },
  footer: { paddingHorizontal: space.lg, paddingTop: space.xs, gap: space.xs },
});
