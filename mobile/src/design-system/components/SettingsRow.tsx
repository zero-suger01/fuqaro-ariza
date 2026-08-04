import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colorTokens, motion, radii, spacing, typography } from '@/design-system/tokens';

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
        <Feather name={icon} size={18} color={destructive ? colorTokens.danger : colorTokens.primary} aria-hidden />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, destructive && styles.titleDestructive]}>{title}</Text>
        {value ? <Text numberOfLines={1} style={styles.value}>{value}</Text> : null}
      </View>
      {onPress && !destructive ? <Feather name="chevron-right" size={18} color={colorTokens.textMuted} aria-hidden /> : null}
    </>
  );

  if (!onPress) {
    return <View accessible style={[styles.row, !last && styles.divider]}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, !last && styles.divider, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colorTokens.border,
  },
  iconFrame: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: radii.icon,
    borderTopRightRadius: radii.icon,
    borderBottomRightRadius: radii.inner,
    borderBottomLeftRadius: radii.icon,
    backgroundColor: colorTokens.primaryMist,
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
    ...typography.caption,
    color: colorTokens.textSecondary,
    marginTop: 1,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: motion.pressScale }],
  },
});
