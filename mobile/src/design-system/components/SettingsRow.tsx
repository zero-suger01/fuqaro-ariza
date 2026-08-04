import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colorTokens, componentShapes, spacing, typography } from '@/design-system/tokens';

type SettingsRowProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  last?: boolean;
};

export function SettingsRow({ icon, title, value, onPress, destructive = false, last = false }: SettingsRowProps) {
  const content = (
    <>
      <View style={[styles.iconFrame, destructive && styles.iconFrameDestructive]}>
        <Feather name={icon} size={17} color={destructive ? colorTokens.danger : colorTokens.primary} aria-hidden />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={2} maxFontSizeMultiplier={1.5} style={[styles.title, destructive && styles.titleDestructive]}>
          {title}
        </Text>
        {value ? <Text numberOfLines={2} maxFontSizeMultiplier={1.5} style={styles.value}>{value}</Text> : null}
      </View>
      {onPress && !destructive ? <Feather name="chevron-right" size={17} color={colorTokens.textMuted} aria-hidden /> : null}
      {!last ? <View style={styles.separator} aria-hidden /> : null}
    </>
  );

  if (!onPress) {
    return <View accessible accessibilityLabel={value ? `${title}. ${value}` : title} style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}. ${value}` : title}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'relative',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  iconFrame: {
    ...componentShapes.icon,
    width: 34,
    height: 34,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorTokens.primarySoft,
  },
  iconFrameDestructive: {
    backgroundColor: colorTokens.dangerSoft,
  },
  copy: {
    minWidth: 0,
    flex: 1,
  },
  title: {
    ...typography.bodyStrong,
    color: colorTokens.textPrimary,
  },
  titleDestructive: {
    color: colorTokens.danger,
  },
  value: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '400',
    color: colorTokens.textSecondary,
    marginTop: 1,
  },
  separator: {
    position: 'absolute',
    left: 58,
    right: spacing.sm,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colorTokens.border,
  },
  pressed: {
    backgroundColor: colorTokens.primaryMist,
  },
});
