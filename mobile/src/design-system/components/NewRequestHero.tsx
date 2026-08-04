import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '@/i18n';
import { CivicEmboss } from '@/design-system/components/CivicEmboss';
import { getCabinetDesignCopy } from '@/design-system/copy';
import { colorTokens, componentShapes, motion, shadows, spacing, typography } from '@/design-system/tokens';

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
      <CivicEmboss />
      <View style={styles.iconFrame}>
        <Feather name="edit-3" size={21} color={colorTokens.white} aria-hidden />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={2} maxFontSizeMultiplier={1.4} style={styles.title}>{copy.heroTitle}</Text>
        <Text numberOfLines={2} maxFontSizeMultiplier={1.5} style={styles.description}>{copy.heroDescription}</Text>
      </View>
      <View style={styles.actionFrame}>
        <Feather name="arrow-up-right" size={18} color={colorTokens.white} aria-hidden />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...componentShapes.surface,
    ...shadows.card,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 124,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colorTokens.primaryDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: motion.pressScale }],
  },
  iconFrame: {
    ...componentShapes.icon,
    width: 46,
    height: 46,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.11)',
  },
  copy: {
    minWidth: 0,
    flex: 1,
  },
  title: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.1,
    color: colorTokens.white,
  },
  description: {
    ...typography.supporting,
    color: colorTokens.onDarkMuted,
    marginTop: spacing.xxs,
  },
  actionFrame: {
    ...componentShapes.icon,
    width: 38,
    height: 38,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
});
