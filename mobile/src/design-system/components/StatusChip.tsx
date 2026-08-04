import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useI18n } from '@/i18n';
import { getCabinetDesignCopy } from '@/design-system/copy';
import { getCitizenStatusDefinition, getCitizenStatusLabel } from '@/design-system/status';
import { radii, typography } from '@/design-system/tokens';

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
      <View style={[styles.dot, { backgroundColor: definition.indicator }]} aria-hidden />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.86}
        maxFontSizeMultiplier={1.4}
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
    minHeight: 30,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  compact: {
    minHeight: 26,
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    flexShrink: 0,
    borderRadius: 3,
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
