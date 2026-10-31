import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useWindowDimensions, type ColorValue } from "react-native";

import { setupTheme } from "./theme";

// Reuse the installed regular Material Symbols font; adding weights loads extra fonts.
const symbols = {
  home: { ios: "house", android: "home", web: "home" },
  briefcase: { ios: "briefcase", android: "work", web: "work" },
  bell: { ios: "bell", android: "notifications", web: "notifications" },
  user: { ios: "person.crop.circle", android: "person", web: "person" },
  search: { ios: "magnifyingglass", android: "search", web: "search" },
  pin: {
    ios: "mappin.and.ellipse",
    android: "location_on",
    web: "location_on",
  },
  remote: { ios: "laptopcomputer", android: "laptop_mac", web: "laptop_mac" },
  arrowRight: {
    ios: "arrow.right",
    android: "arrow_forward",
    web: "arrow_forward",
  },
  chevronRight: {
    ios: "chevron.right",
    android: "chevron_right",
    web: "chevron_right",
  },
  check: {
    ios: "checkmark.circle",
    android: "check_circle",
    web: "check_circle",
  },
  mail: { ios: "envelope", android: "mail", web: "mail" },
  lock: { ios: "lock", android: "lock", web: "lock" },
  eye: { ios: "eye", android: "visibility", web: "visibility" },
  eyeOff: {
    ios: "eye.slash",
    android: "visibility_off",
    web: "visibility_off",
  },
  plus: { ios: "plus", android: "add", web: "add" },
  shield: { ios: "shield", android: "shield", web: "shield" },
  clock: { ios: "clock", android: "schedule", web: "schedule" },
  calendar: {
    ios: "calendar",
    android: "calendar_today",
    web: "calendar_today",
  },
  sparkles: { ios: "sparkles", android: "auto_awesome", web: "auto_awesome" },
  layers: { ios: "square.stack", android: "layers", web: "layers" },
  help: { ios: "questionmark.circle", android: "help", web: "help" },
  file: { ios: "doc.text", android: "description", web: "description" },
  close: { ios: "xmark", android: "close", web: "close" },
  refresh: { ios: "arrow.clockwise", android: "refresh", web: "refresh" },
  coins: { ios: "banknote", android: "payments", web: "payments" },
  digital: { ios: "paintbrush", android: "palette", web: "palette" },
  truck: {
    ios: "shippingbox",
    android: "local_shipping",
    web: "local_shipping",
  },
  book: { ios: "book", android: "school", web: "school" },
  cleaning: {
    ios: "sparkles",
    android: "cleaning_services",
    web: "cleaning_services",
  },
  event: { ios: "party.popper", android: "celebration", web: "celebration" },
  filter: { ios: "slider.horizontal.3", android: "tune", web: "tune" },
  edit: { ios: "pencil", android: "edit", web: "edit" },
  trash: { ios: "trash", android: "delete", web: "delete" },
  chevronLeft: {
    ios: "chevron.left",
    android: "chevron_left",
    web: "chevron_left",
  },
  chevronDown: {
    ios: "chevron.down",
    android: "expand_more",
    web: "expand_more",
  },
  chat: { ios: "bubble.left", android: "chat_bubble", web: "chat_bubble" },
  tick: { ios: "checkmark", android: "check", web: "check" },
  flag: { ios: "flag", android: "flag", web: "flag" },
  camera: { ios: "camera", android: "photo_camera", web: "photo_camera" },
  info: { ios: "info.circle", android: "info", web: "info" },
  wifiOff: { ios: "wifi.slash", android: "wifi_off", web: "wifi_off" },
} satisfies Record<string, SymbolViewProps["name"]>;

export type AppIconName = keyof typeof symbols;

/** Decorative only: the containing control or adjacent text supplies the name. */
export function AppIcon({
  name,
  size = 20,
  color = setupTheme.color.primary,
}: Readonly<{
  name: AppIconName;
  size?: number;
  color?: ColorValue;
}>) {
  // Material Symbols is rendered as scalable text on Android; reserve the scaled
  // glyph footprint so large system fonts do not clip inside a fixed icon box.
  const { fontScale } = useWindowDimensions();
  return (
    <SymbolView
      name={symbols[name]}
      size={size}
      tintColor={color}
      type="monochrome"
      style={{ width: size * fontScale, height: size * fontScale }}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    />
  );
}
