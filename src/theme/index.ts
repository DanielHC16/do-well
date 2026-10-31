import { palette, status } from "./colors";
import { type } from "./typography";

export { palette, status, type StatusTone } from "./colors";
export {
  faceForWeight,
  fontFiles,
  type,
  type FontFace,
  type TypeVariant,
} from "./typography";

// 4-pt grid.
export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  input: 16,
  card: 20,
  hero: 28,
  pill: 999,
} as const;

export const size = {
  touchTarget: 48,
  primaryButton: 56,
  icon: 22,
  iconSmall: 18,
  iconButton: 44,
  avatar: 40,
  avatarLarge: 72,
  avatarHero: 96,
  dot: 6,
  donut: 112,
  donutStroke: 12,
  progressBar: 8,
  fab: 60,
  tabBar: 64,
  statTile: 68,
  tabPill: 56,
  tabPillHeight: 30,
  contentMax: 720,
  textAreaMin: 112,
  screenPadding: space.lg,
  iconStroke: 1.75,
} as const;

// Flat by design: a 1px border plus Android elevation <= 2.
export const elevation = {
  none: { elevation: 0 },
  card: {
    elevation: 1,
    shadowColor: palette.text,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  raised: {
    elevation: 2,
    shadowColor: palette.text,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
} as const;

export const motion = {
  pressScale: 0.98,
  fast: 150,
  base: 220,
  slow: 420,
  shimmer: 1200,
} as const;

export const theme = {
  color: palette,
  status,
  type,
  space,
  radius,
  size,
  elevation,
  motion,
} as const;

export type Theme = typeof theme;
