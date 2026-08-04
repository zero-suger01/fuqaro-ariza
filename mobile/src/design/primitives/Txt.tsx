import { Text, type TextProps, type TextStyle } from 'react-native';
import { colors, type as typeScale } from '../tokens';

type Variant = keyof typeof typeScale;

type Tone =
  | 'default'
  | 'secondary'
  | 'muted'
  | 'faint'
  | 'primary'
  | 'accent'
  | 'onDark'
  | 'onDarkSoft'
  | 'onDarkFaint'
  | 'danger'
  | 'success'
  | 'warning';

const tones: Record<Tone, string> = {
  default: colors.text,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  faint: colors.textFaint,
  primary: colors.primary,
  accent: colors.accentInk,
  onDark: colors.onDark,
  onDarkSoft: colors.onDarkSoft,
  onDarkFaint: colors.onDarkFaint,
  danger: colors.danger,
  success: colors.success,
  warning: colors.warning,
};

export type TxtProps = TextProps & {
  variant?: Variant;
  tone?: Tone;
  center?: boolean;
  /** Uppercases and is meant for the `overline` variant. */
  caps?: boolean;
};

/**
 * Every piece of text in the app goes through here. Manrope ships one file per
 * weight, so weight is expressed as `fontFamily` — never `fontWeight`, which
 * silently falls back to a synthesised face on Android.
 */
export function Txt({ variant = 'body', tone = 'default', center, caps, style, ...props }: TxtProps) {
  const base = typeScale[variant] as TextStyle;
  return (
    <Text
      {...props}
      style={[
        base,
        { color: tones[tone] },
        center && { textAlign: 'center' },
        caps && { textTransform: 'uppercase' },
        style,
      ]}
    />
  );
}
