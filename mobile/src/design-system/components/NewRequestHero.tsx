import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '@/i18n';
import { getCabinetDesignCopy } from '@/design-system/copy';
import { colorTokens, componentShapes, motion, radii, spacing, typography } from '@/design-system/tokens';

export function NewRequestHero({ onPress }: { onPress: () => void }) {
  const { language } = useI18n();
  const copy = getCabinetDesignCopy(language);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={copy.heroAction}
      accessibilityHint={copy.heroDescription}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.accentRail} aria-hidden>
        <View style={styles.accentRailStrong} />
        <View style={styles.accentRailSoft} />
      </View>
      <View style={styles.iconFrame}>
        <Feather name="edit-3" size={21} color={colorTokens.white} aria-hidden />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{copy.heroTitle}</Text>
        <Text numberOfLines={2} style={styles.description}>{copy.heroDescription}</Text>
      </View>
      <View style={styles.arrowFrame}>
        <Feather name="arrow-up-right" size={19} color={colorTokens.white} aria-hidden />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...componentShapes.leading,
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 124,
    backgroundColor: colorTokens.primaryDark,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: motion.pressScale }],
  },
  iconFrame: {
    width: 48,
    height: 48,
    borderTopLeftRadius: radii.icon,
    borderTopRightRadius: radii.compactCard,
    borderBottomRightRadius: radii.icon,
    borderBottomLeftRadius: radii.inner,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorTokens.primary,
    borderWidth: 1,
    borderColor: colorTokens.onDarkBorder,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.cardTitle,
    color: colorTokens.white,
  },
  description: {
    ...typography.supporting,
    color: colorTokens.onDarkMuted,
    marginTop: spacing.xxs,
  },
  arrowFrame: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: radii.icon,
    borderTopRightRadius: radii.icon,
    borderBottomRightRadius: radii.inner,
    borderBottomLeftRadius: radii.icon,
    borderWidth: 1,
    borderColor: colorTokens.onDarkBorder,
  },
  accentRail: {
    position: 'absolute',
    left: 0,
    top: spacing.lg,
    bottom: spacing.lg,
    width: 3,
    gap: 3,
  },
  accentRailStrong: {
    flex: 2,
    backgroundColor: colorTokens.brass,
  },
  accentRailSoft: {
    flex: 1,
    backgroundColor: colorTokens.primary,
  },
});
