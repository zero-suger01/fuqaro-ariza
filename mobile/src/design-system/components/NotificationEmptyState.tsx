import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { useI18n } from '@/i18n';
import { getCabinetDesignCopy } from '@/design-system/copy';
import { colorTokens, componentShapes, motion, radii, spacing, typography } from '@/design-system/tokens';

export function NotificationEmptyState({ onViewRequests }: { onViewRequests: () => void }) {
  const { language } = useI18n();
  const copy = getCabinetDesignCopy(language);

  return (
    <View style={styles.card}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.illustration}>
        <Svg width="128" height="104" viewBox="0 0 128 104">
          <Path d="M18 22h75l17 17v47H18z" fill={colorTokens.primaryMist} stroke={colorTokens.borderStrong} strokeWidth="2" />
          <Path d="M93 22v17h17" fill="none" stroke={colorTokens.borderStrong} strokeWidth="2" />
          <G transform="translate(42 31)">
            <Path d="M22 5c-8 0-14 6-14 14v10l-5 7h38l-5-7V19c0-8-6-14-14-14Z" fill={colorTokens.surface} stroke={colorTokens.primary} strokeWidth="2.5" strokeLinejoin="round" />
            <Path d="M17 41c1 3 3 5 5 5s4-2 5-5" fill="none" stroke={colorTokens.primary} strokeWidth="2.5" strokeLinecap="round" />
          </G>
          <Line x1="29" y1="78" x2="56" y2="78" stroke={colorTokens.borderStrong} strokeWidth="2" strokeLinecap="round" />
          <Line x1="29" y1="85" x2="47" y2="85" stroke={colorTokens.borderStrong} strokeWidth="2" strokeLinecap="round" />
          <Rect x="95" y="75" width="22" height="19" rx="7" fill={colorTokens.successSoft} />
          <Circle cx="106" cy="84.5" r="3.5" fill={colorTokens.success} />
        </Svg>
      </View>
      <Text accessibilityRole="header" style={styles.title}>{copy.notificationEmptyTitle}</Text>
      <Text style={styles.text}>{copy.notificationEmptyText}</Text>
      <Pressable
        onPress={onViewRequests}
        accessibilityRole="button"
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Text style={styles.actionText}>{copy.notificationEmptyAction}</Text>
        <Feather name="arrow-right" size={16} color={colorTokens.primary} aria-hidden />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...componentShapes.trailing,
    alignItems: 'center',
    backgroundColor: colorTokens.surface,
    borderWidth: 1,
    borderColor: colorTokens.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  illustration: {
    width: 128,
    height: 104,
  },
  title: {
    ...typography.cardTitle,
    color: colorTokens.textPrimary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  text: {
    ...typography.supporting,
    maxWidth: 290,
    color: colorTokens.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxs,
  },
  action: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderTopLeftRadius: radii.control,
    borderTopRightRadius: radii.control,
    borderBottomRightRadius: radii.inner,
    borderBottomLeftRadius: radii.control,
    borderWidth: 1,
    borderColor: colorTokens.borderStrong,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  actionText: {
    ...typography.button,
    color: colorTokens.primary,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: motion.pressScale }],
  },
});
