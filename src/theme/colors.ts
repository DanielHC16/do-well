import { brand } from "@/shared/ui/theme";

// Derived from the brand palette in src/shared/ui/theme.ts (single source of truth).
export const palette = {
  navy: brand.navy,
  navyPressed: brand.navyPressed,
  purple: brand.purple,
  lavender: brand.lavender,
  mint: brand.mint,
  bg: brand.background,
  surface: brand.surface,
  // Unselected chip/segment tracks: a subtle lavender tint.
  surfaceMuted: brand.lavender,
  text: brand.text,
  textSecondary: brand.textSecondary,
  textTertiary: brand.textTertiary,
  border: brand.border,
  borderStrong: brand.borderStrong,
  onPrimary: brand.white,
  // Unread/notification indicator on the navy header.
  badge: brand.danger.base,
  scrim: "rgba(30, 27, 74, 0.45)",
  // Diagonal stripe texture on stat tiles and progress remainders.
  stripe: "rgba(30, 27, 74, 0.05)",
  onDarkMuted: "rgba(255, 255, 255, 0.72)",
  onDarkSubtle: "rgba(255, 255, 255, 0.14)",
  // Mint tint for AI suggestion surfaces.
  mintTint: "#EEFAF6",
  mintBorder: "#C9EEE1",
} as const;

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export const status: Record<
  StatusTone,
  Readonly<{ base: string; fg: string; bg: string; border: string }>
> = {
  success: brand.success,
  warning: brand.warning,
  danger: brand.danger,
  info: brand.info,
  neutral: {
    base: brand.textTertiary,
    fg: brand.textSecondary,
    bg: "#F3F2F8",
    border: brand.border,
  },
};
