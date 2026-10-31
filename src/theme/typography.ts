import type { TextStyle } from "react-native";

// Locally bundled Outfit faces (branding/fonts, SIL OFL 1.1). The shared Text
// wrapper maps `fontWeight` to the matching face, so variants only state weight.
export const fontFiles = {
  OutfitRegular: require("../../branding/fonts/Outfit-Regular.ttf"),
  OutfitMedium: require("../../branding/fonts/Outfit-Medium.ttf"),
  OutfitSemiBold: require("../../branding/fonts/Outfit-SemiBold.ttf"),
  OutfitBold: require("../../branding/fonts/Outfit-Bold.ttf"),
} as const;

export type FontFace = keyof typeof fontFiles;

export function faceForWeight(weight: TextStyle["fontWeight"]): FontFace {
  const numeric = weight === "bold" ? 700 : Number(weight ?? 400);
  if (numeric >= 700) return "OutfitBold";
  if (numeric >= 600) return "OutfitSemiBold";
  if (numeric >= 500) return "OutfitMedium";
  return "OutfitRegular";
}

export const type = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: "600" },
  h1: { fontSize: 24, lineHeight: 30, fontWeight: "600" },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: "600" },
  title: { fontSize: 16, lineHeight: 22, fontWeight: "500" },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: "600" },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "400" },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: "500" },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;
