import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useI18n } from '@/i18n';
import { getCabinetDesignCopy } from '@/design-system/copy';
import { getCitizenStatusDefinition, getCitizenStatusLabel } from '@/design-system/status';
import { radii, spacing, typography } from '@/design-system/tokens';

type StatusChipProps = {
  status: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function StatusChip({ status, compact = false, style }: StatusChipProps) {
  const { language } = useI18n();
  const copy = getCabinetDesignCopy(language);
  const definition = getCitizenStatusDefinition(status);
  const label = getCitizenStatusLabel(status, language);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${copy.statusPrefix}: ${label}`}
      style={[
        styles.base,
        compact ? styles.compact : styles.regular,
        { backgroundColor: definition.background },
        style,
      ]}
    >
      <Feather name={definition.icon} size={compact ? 13 : 14} color={definition.indicator} aria-hidden />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.84}
        style={[styles.text, compact && styles.compactText, { color: definition.foreground }]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
  },
  regular: {
    minHeight: 32,
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  compact: {
    minHeight: 28,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: {
    ...typography.status,
    flexShrink: 1,
  },
  compactText: {
    fontSize: 11,
    lineHeight: 15,
  },
});
