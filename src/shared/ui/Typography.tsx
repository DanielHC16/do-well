import { createContext, useContext, type PropsWithChildren } from "react";
import { useFonts } from "expo-font";
import {
  ActivityIndicator,
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  View,
  type TextProps,
  type TextInputProps,
  type TextStyle,
} from "react-native";
import { setupTheme as theme } from "./theme";

const FontsReady = createContext(false);
const fonts = {
  InterRegular: require("../../../branding/fonts/Inter-Regular.ttf"),
  InterMedium: require("../../../branding/fonts/Inter-Medium.ttf"),
  InterSemiBold: require("../../../branding/fonts/Inter-SemiBold.ttf"),
  InterBold: require("../../../branding/fonts/Inter-Bold.ttf"),
};

export function TypographyProvider({ children }: PropsWithChildren) {
  const [loaded, error] = useFonts(fonts);
  if (!loaded && !error) {
    return (
      <View accessibilityLabel="Loading Do Well" style={styles.loading}>
        <ActivityIndicator color={theme.color.primary} />
      </View>
    );
  }
  return <FontsReady.Provider value={loaded}>{children}</FontsReady.Provider>;
}

function fontFace(style: TextStyle | null | undefined): TextStyle {
  // Preserve intentional icon/custom font families rather than replacing glyphs.
  if (style?.fontFamily) return {};
  const weight = style?.fontWeight;
  const family =
    weight === "bold" || Number(weight) >= 700
      ? "InterBold"
      : Number(weight) >= 600
        ? "InterSemiBold"
        : Number(weight) >= 500
          ? "InterMedium"
          : "InterRegular";
  return { fontFamily: family, fontWeight: "normal" };
}

export function Text({ style, ...props }: TextProps) {
  const ready = useContext(FontsReady);
  return (
    <NativeText
      {...props}
      style={[style, ready && fontFace(StyleSheet.flatten(style))]}
    />
  );
}

export function TextInput({ style, ...props }: TextInputProps) {
  const ready = useContext(FontsReady);
  return (
    <NativeTextInput
      {...props}
      style={[style, ready && fontFace(StyleSheet.flatten(style))]}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.color.background,
  },
});
