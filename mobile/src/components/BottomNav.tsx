import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '@/i18n';
import { getCabinetDesignCopy } from '@/design-system/copy';
import { colorTokens, motion, radii, shadows, spacing, typography } from '@/design-system/tokens';

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
              <View style={[styles.iconWrap, selected && styles.iconWrapSelected, isNew && styles.newIcon]}>
                <Feather
                  name={item.icon}
                  size={isNew ? 24 : 20}
                  color={isNew ? colorTokens.white : selected ? colorTokens.primary : colorTokens.textMuted}
                  aria-hidden
                />
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
                style={[styles.label, selected && styles.labelSelected, isNew && styles.newLabel]}
              >
                {item.shortLabel || item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colorTokens.background,
    paddingTop: spacing.sm,
  },
  shell: {
    ...shadows.navigation,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorTokens.surface,
    borderWidth: 1,
    borderColor: colorTokens.border,
    borderRadius: radii.navigation,
    paddingHorizontal: spacing.xxs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  item: {
    minWidth: 0,
    minHeight: 58,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 2,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: motion.pressScale }],
  },
  newItem: {
    marginTop: -14,
  },
  iconWrap: {
    width: 40,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: radii.icon,
    borderTopRightRadius: radii.icon,
    borderBottomRightRadius: radii.icon,
    borderBottomLeftRadius: 6,
  },
  iconWrapSelected: {
    backgroundColor: colorTokens.primarySoft,
  },
  newIcon: {
    width: 50,
    height: 50,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    borderBottomLeftRadius: 10,
    backgroundColor: colorTokens.primary,
    borderWidth: 4,
    borderColor: colorTokens.surface,
  },
  label: {
    ...typography.navigation,
    width: '100%',
    minHeight: 16,
    color: colorTokens.textMuted,
    textAlign: 'center',
  },
  labelSelected: {
    color: colorTokens.primaryDark,
    fontWeight: '700',
  },
  newLabel: {
    color: colorTokens.primaryDark,
    fontWeight: '700',
  },
});
