import { colorTokens, radii } from '@/design-system/tokens';

/** Backwards-compatible aliases while screens move onto the design system. */
export const colors = {
  ink: colorTokens.textPrimary,
  muted: colorTokens.textSecondary,
  teal: colorTokens.primary,
  tealDark: colorTokens.primaryDark,
  mint: colorTokens.primarySoft,
  background: colorTokens.background,
  white: colorTokens.surface,
  line: colorTokens.border,
  danger: colorTokens.danger,
  success: colorTokens.success,
};

export const radius = {
  card: radii.card,
  control: radii.control,
  pill: radii.pill,
};

export * from '@/design-system/tokens';
