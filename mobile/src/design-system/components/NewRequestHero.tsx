import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '@/i18n';
import { getCabinetDesignCopy } from '@/design-system/copy';
import { PatternSurface } from '@/design-system/components/PatternSurface';
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
      <PatternSurface variant="dark" />
      <View style={styles.iconFrame}>
        <Feather name="edit-3" size={25} color={colorTokens.white} aria-hidden />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{copy.heroTitle}</Text>
        <Text style={styles.description}>{copy.heroDescription}</Text>
        <View style={styles.action}>
          <Text style={styles.actionText}>{copy.heroAction}</Text>
          <Feather name="arrow-right" size={17} color={colorTokens.white} aria-hidden />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...componentShapes.hero,
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colorTokens.primaryDark,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: motion.pressScale }],
  },
  iconFrame: {
    width: 52,
    height: 52,
    borderTopLeftRadius: radii.icon,
    borderTopRightRadius: radii.compactCard,
    borderBottomRightRadius: radii.icon,
    borderBottomLeftRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorTokens.primary,
    borderWidth: 1,
    borderColor: colorTokens.onDarkBorder,
  },
  copy: {
    flex: 1,
  },
  title: {
    ...typography.cardTitle,
    color: colorTokens.white,
  },
  description: {
    ...typography.supporting,
    color: colorTokens.onDarkMuted,
    marginTop: spacing.xs,
  },
  action: {
    minHeight: 36,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.control,
    backgroundColor: colorTokens.primary,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.md,
  },
  actionText: {
    ...typography.button,
    color: colorTokens.white,
  },
});
