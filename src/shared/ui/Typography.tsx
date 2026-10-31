import {
  createContext,
  useContext,
  useEffect,
  type ComponentRef,
  type PropsWithChildren,
  type Ref,
} from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextProps,
  type TextInputProps,
  type TextStyle,
} from "react-native";

import { faceForWeight, fontFiles } from "@/theme";

// Hold the native splash until fonts settle so the first frame is already Outfit.
void SplashScreen.preventAutoHideAsync().catch(() => {
  // The splash may already be hidden after a fast refresh; nothing to hold.
});

const FontsReady = createContext(false);

export function TypographyProvider({ children }: PropsWithChildren) {
  const [loaded, error] = useFonts(fontFiles);
  const settled = loaded || Boolean(error);

  useEffect(() => {
    if (settled) void SplashScreen.hideAsync().catch(() => undefined);
  }, [settled]);

  if (!settled) return null;
  return <FontsReady.Provider value={loaded}>{children}</FontsReady.Provider>;
}

function fontFace(style: TextStyle | null | undefined): TextStyle {
  // Preserve intentional icon/custom font families rather than replacing glyphs.
  if (style?.fontFamily) return {};
  return { fontFamily: faceForWeight(style?.fontWeight), fontWeight: "normal" };
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

export type TextInputHandle = ComponentRef<typeof NativeTextInput>;

export function TextInput({
  style,
  ref,
  ...props
}: TextInputProps & { ref?: Ref<TextInputHandle> }) {
  const ready = useContext(FontsReady);
  return (
    <NativeTextInput
      {...props}
      ref={ref}
      style={[style, ready && fontFace(StyleSheet.flatten(style))]}
    />
  );
}
