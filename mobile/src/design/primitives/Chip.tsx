import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Touchable } from './Touchable';
import { Txt } from './Txt';
import { colors, radius, space, squircle } from '../tokens';

type ChipProps = {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'default' | 'onDark';
  style?: StyleProp<ViewStyle>;
};

/** Selectable pill — language switch, filters, category picks. */
export function Chip({ label, icon, selected = false, onPress, tone = 'default', style }: ChipProps) {
  const onDark = tone === 'onDark';
  const foreground = selected
    ? onDark
      ? colors.night
      : colors.onDark
    : onDark
      ? colors.onDarkSoft
      : colors.textSecondary;

  return (
    <Touchable
      onPress={onPress}
      haptic="select"
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        squircle,
        styles.chip,
        onDark ? styles.chipDark : styles.chipLight,
        selected && (onDark ? styles.selectedDark : styles.selectedLight),
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={14} color={foreground} /> : null}
      <Txt variant="caption" numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ color: foreground }}>
        {label}
      </Txt>
    </Touchable>
  );
}

type BadgeProps = {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  color: string;
  background: string;
  style?: StyleProp<ViewStyle>;
  /** Leading dot instead of an icon — quieter, good in dense rows. */
  dot?: boolean;
};

/** Non-interactive status marker. */
export function Badge({ label, icon, color, background, dot, style }: BadgeProps) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[squircle, styles.badge, { backgroundColor: background }, style]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      {icon && !dot ? <Feather name={icon} size={12.5} color={color} /> : null}
      <Txt
        variant="caption"
        numberOfLines={1}
        maxFontSizeMultiplier={1.25}
        style={[styles.badgeLabel, { color }]}
      >
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    paddingHorizontal: space.sm,
  },
  chipLight: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
  },
  chipDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: colors.hairlineOnDark,
  },
  selectedLight: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectedDark: {
    backgroundColor: colors.onDark,
    borderColor: colors.onDark,
  },
  badge: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    borderRadius: radius.pill,
    paddingHorizontal: space.xs + 2,
  },
  badgeLabel: {
    flexShrink: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
