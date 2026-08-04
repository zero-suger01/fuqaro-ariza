import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Touchable, type Feedback } from './Touchable';
import { Txt } from './Txt';
import { StarLoader } from '../motifs';
import { colors, elevation, palette, radius, space, squircle, type } from '../tokens';

type Variant = 'primary' | 'gold' | 'night' | 'outline' | 'ghost' | 'onDark' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const heights: Record<Size, number> = { sm: 42, md: 50, lg: 58 };
const pads: Record<Size, number> = { sm: space.md, md: space.lg, lg: space.xl };

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Feather.glyphMap;
  /** Icon placed after the label — use for forward motion. */
  trailingIcon?: keyof typeof Feather.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
  haptic?: Feedback;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

const foreground: Record<Variant, string> = {
  primary: colors.onDark,
  gold: palette.brass[700],
  night: colors.onDark,
  outline: colors.text,
  ghost: colors.primary,
  onDark: colors.onDark,
  danger: colors.onDark,
};

const gradientFor: Record<Variant, readonly [string, string] | null> = {
  primary: [palette.turquoise[400], palette.turquoise[600]],
  gold: [palette.brass[200], palette.brass[400]],
  night: [palette.lapis[800], palette.lapis[950]],
  outline: null,
  ghost: null,
  onDark: null,
  danger: [palette.anor[500], palette.anor[600]],
};

/**
 * Actions carry their own light: gradient fills with a colour-matched glow
 * instead of a flat block, and a spring that makes the press feel physical.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  trailingIcon,
  loading = false,
  disabled = false,
  block = true,
  haptic = 'medium',
  style,
  accessibilityHint,
}: ButtonProps) {
  const gradient = gradientFor[variant];
  const tint = foreground[variant];
  const height = heights[size];
  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <Touchable
      onPress={onPress}
      disabled={disabled || loading}
      haptic={haptic}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        squircle,
        styles.base,
        {
          height,
          borderRadius: radius.md,
          paddingHorizontal: pads[size],
          alignSelf: block ? 'stretch' : 'flex-start',
        },
        variant === 'primary' && elevation.action,
        variant === 'gold' && elevation.gild,
        variant === 'night' && elevation.raised,
        variant === 'outline' && styles.outline,
        variant === 'onDark' && styles.onDark,
        style,
      ]}
    >
      {gradient ? (
        <LinearGradient
          colors={[...gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius.md }]}
        />
      ) : null}

      {/* Top-edge sheen: the highlight that reads as a physical surface. */}
      {gradient ? (
        <LinearGradient
          colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
          style={[styles.sheen, { borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md }]}
        />
      ) : null}

      {loading ? (
        <StarLoader size={iconSize + 8} color={tint} accent={tint} />
      ) : (
        <View style={styles.row}>
          {icon ? <Feather name={icon} size={iconSize} color={tint} /> : null}
          <Txt style={[type.button, { color: tint }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {label}
          </Txt>
          {trailingIcon ? <Feather name={trailingIcon} size={iconSize} color={tint} /> : null}
        </View>
      )}
    </Touchable>
  );
}

/** Round icon-only control — back buttons, overflow, quick actions. */
export function IconButton({
  icon,
  onPress,
  label,
  tone = 'light',
  size = 44,
  style,
  haptic = 'light',
}: {
  icon: keyof typeof Feather.glyphMap;
  onPress?: () => void;
  label: string;
  tone?: 'light' | 'dark' | 'tint' | 'gold';
  size?: number;
  style?: StyleProp<ViewStyle>;
  haptic?: Feedback;
}) {
  const backgrounds = {
    light: colors.surface,
    dark: 'rgba(255,255,255,0.12)',
    tint: colors.primaryTint,
    gold: colors.accentTint,
  } as const;
  const tints = {
    light: colors.text,
    dark: colors.onDark,
    tint: colors.primary,
    gold: colors.accentInk,
  } as const;

  return (
    <Touchable
      onPress={onPress}
      haptic={haptic}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={[
        squircle,
        styles.iconButton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgrounds[tone],
          borderColor: tone === 'dark' ? colors.hairlineOnDark : colors.hairline,
        },
        tone === 'light' && elevation.rest,
        style,
      ]}
    >
      <Feather name={icon} size={size * 0.42} color={tints[tone]} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.hairlineStrong,
  },
  onDark: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '46%',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
});
