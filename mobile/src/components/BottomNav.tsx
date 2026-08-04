import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '@/i18n';
import { getCabinetDesignCopy } from '@/design-system/copy';
import { colorTokens, componentShapes, motion, shadows, spacing, typography } from '@/design-system/tokens';

export type CabinetTab = 'home' | 'complaints' | 'new' | 'notifications' | 'settings';

export function BottomNav({ active, onChange }: { active: CabinetTab; onChange?: (tab: CabinetTab) => void }) {
  const insets = useSafeAreaInsets();
  const { language } = useI18n();
  const copy = getCabinetDesignCopy(language);
  const items: { key: CabinetTab; label: string; shortLabel?: string; icon: keyof typeof Feather.glyphMap }[] = [
    { key: 'home', label: copy.nav.home, icon: 'home' },
    { key: 'complaints', label: copy.nav.requests, icon: 'file-text' },
    { key: 'new', label: copy.nav.newRequest, shortLabel: copy.nav.newShort, icon: 'plus' },
    { key: 'notifications', label: copy.nav.notifications, icon: 'bell' },
    { key: 'settings', label: copy.nav.settings, icon: 'settings' },
  ];

  return (
    <View style={[styles.safeArea, { paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
      <View style={styles.shell} accessibilityRole="tablist">
        {items.map((item) => {
          const selected = active === item.key;
          const isNew = item.key === 'new';
          return (
            <Pressable
              key={item.key}
              onPress={() => isNew ? router.push('/complaint') : onChange?.(item.key)}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
              style={({ pressed }) => [styles.item, isNew && styles.newItem, pressed && styles.pressed]}
            >
              <View style={[styles.iconFrame, selected && styles.iconFrameSelected, isNew && styles.newIconFrame]}>
                <Feather
                  name={item.icon}
                  size={isNew ? 20 : 19}
                  color={isNew ? colorTokens.white : selected ? colorTokens.primary : colorTokens.textMuted}
                  aria-hidden
                />
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={[styles.label, selected && styles.labelSelected, isNew && styles.newLabel]}
              >
                {item.shortLabel || item.label}
              </Text>
              <View style={[styles.selectionDot, selected && !isNew && styles.selectionDotActive]} aria-hidden />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    ...shadows.navigation,
    flexShrink: 0,
    backgroundColor: 'rgba(251,252,252,0.97)',
  },
  shell: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingTop: 6,
  },
  item: {
    minWidth: 0,
    minHeight: 54,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 2,
  },
  newItem: {
    transform: [{ translateY: -2 }],
  },
  pressed: {
    opacity: 0.68,
    transform: [{ scale: motion.pressScale }],
  },
  iconFrame: {
    ...componentShapes.icon,
    width: 36,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFrameSelected: {
    backgroundColor: colorTokens.primarySoft,
  },
  newIconFrame: {
    width: 38,
    height: 34,
    backgroundColor: colorTokens.primary,
  },
  label: {
    ...typography.navigation,
    width: '100%',
    color: colorTokens.textMuted,
    textAlign: 'center',
  },
  labelSelected: {
    color: colorTokens.textPrimary,
  },
  newLabel: {
    color: colorTokens.primaryDark,
  },
  selectionDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  selectionDotActive: {
    backgroundColor: colorTokens.primary,
  },
});
