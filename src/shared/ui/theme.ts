/**
 * Single source of truth for Do Well brand color (sampled from the navy/purple
 * logo). `@/theme` derives every color token from `brand`; screens never use
 * raw hex values. Lavender is reserved for subtle tints only.
 */
export const brand = {
  navy: "#1E1B4A",
  navyPressed: "#312C67",
  purple: "#7955CF",
  lavender: "#EEEAFB",
  background: "#F8F7FC",
  surface: "#FFFFFF",
  border: "#E7E4F2",
  borderStrong: "#D8D4EA",
  mint: "#A7E8D4",
  text: "#1E1B4A",
  textSecondary: "#6B6880",
  // ~2.6:1 on white: decoration and disabled text only, never meaningful copy.
  textTertiary: "#A09DB3",
  white: "#FFFFFF",
  // Status hues; `fg` variants keep WCAG AA (>= 4.5:1) on their tints.
  success: { base: "#4CC9A6", fg: "#1F6F57", bg: "#E7F7F0", border: "#BFEBDC" },
  warning: { base: "#E58A2B", fg: "#8F4E0E", bg: "#FCF1E6", border: "#F7DABB" },
  danger: { base: "#D9534F", fg: "#B23A36", bg: "#FAEAEA", border: "#F3C8C7" },
  info: { base: "#7955CF", fg: "#5F3DB0", bg: "#F1EDFB", border: "#DCD2F4" },
} as const;

/**
 * Legacy token shape still used by screens that have not been migrated to
 * `@/theme` yet. Values come from `brand`; deleted once all screens migrate.
 */
export const setupTheme = {
  color: {
    primary: brand.navy,
    onPrimary: brand.white,
    overlay: "rgba(30, 27, 74, 0.45)",
    secondary: brand.purple,
    mint: brand.mint,
    accent: brand.navy,
    accentPressed: brand.navyPressed,
    accentSurface: brand.lavender,
    lilac: brand.lavender,
    background: brand.background,
    border: brand.border,
    borderSoft: brand.borderStrong,
    danger: brand.danger.fg,
    dangerSurface: brand.danger.bg,
    foreground: brand.text,
    highlight: brand.mint,
    highlightSurface: brand.success.bg,
    muted: brand.textSecondary,
    ready: brand.success.fg,
    readySurface: brand.success.bg,
    surface: brand.surface,
    surfaceMuted: brand.lavender,
    warning: brand.warning.fg,
    warningSurface: brand.warning.bg,
  },
  size: {
    touchTarget: 48,
    button: 48,
    avatar: 40,
    contentMax: 720,
    header: 56,
    brand: 36,
  },
  radius: { card: 20, control: 16, small: 8, status: 999 },
  spacing: { compact: 8, content: 20, generous: 32, section: 16, tight: 4 },
  type: {
    body: 15,
    supporting: 14,
    caption: 13,
    display: 30,
    heading: 20,
    section: 18,
    cardTitle: 16,
    label: 12,
    status: 15,
    title: 24,
    dashboard: 24,
  },
  shadow: {
    card: {
      elevation: 1,
      shadowColor: brand.navy,
      shadowOpacity: 0.04,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
    },
  },
} as const;
