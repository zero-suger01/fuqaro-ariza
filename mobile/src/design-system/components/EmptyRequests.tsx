import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '@/i18n';
import { getCabinetDesignCopy } from '@/design-system/copy';
import { colorTokens, componentShapes, motion, radii, spacing, typography } from '@/design-system/tokens';

export function EmptyRequests({ onPress }: { onPress: () => void }) {
  const { language } = useI18n();
  const copy = getCabinetDesignCopy(language);

  return (
    <View style={styles.card}>
      <View style={styles.accentRail} aria-hidden />
      <View style={styles.iconFrame}>
        <Feather name="file-plus" size={24} color={colorTokens.primary} aria-hidden />
      </View>
      <Text style={styles.title}>{copy.emptyTitle}</Text>
      <Text style={styles.text}>{copy.emptyText}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>{copy.emptyAction}</Text>
        <Feather name="arrow-right" size={17} color={colorTokens.primary} aria-hidden />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...componentShapes.trailing,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: colorTokens.primaryMist,
    borderWidth: 1,
    borderColor: colorTokens.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  iconFrame: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: radii.compactCard,
    borderTopRightRadius: radii.icon,
    borderBottomRightRadius: radii.compactCard,
    borderBottomLeftRadius: radii.inner,
    backgroundColor: colorTokens.surface,
  },
  title: {
    ...typography.cardTitle,
    color: colorTokens.textPrimary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  text: {
    ...typography.supporting,
    maxWidth: 330,
    color: colorTokens.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  button: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radii.control,
    backgroundColor: colorTokens.surface,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: motion.pressScale }],
  },
  buttonText: {
    ...typography.button,
    color: colorTokens.primary,
    textAlign: 'center',
  },
  accentRail: {
    position: 'absolute',
    left: 0,
    top: spacing.lg,
    bottom: spacing.lg,
    width: 3,
    backgroundColor: colorTokens.primary,
  },
});
