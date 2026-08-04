import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useI18n } from '@/i18n';
import { getCabinetDesignCopy } from '@/design-system/copy';
import { summarizeCitizenStatuses } from '@/design-system/status';
import { colorTokens, componentShapes, shadows, spacing, typography } from '@/design-system/tokens';

type StatisticItem = {
  value: number;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  surface: string;
};

export function StatisticsOverview({ statuses }: { statuses: readonly string[] }) {
  const { language } = useI18n();
  const { fontScale } = useWindowDimensions();
  const copy = getCabinetDesignCopy(language);
  const summary = summarizeCitizenStatuses(statuses);
  const items: StatisticItem[] = [
    { value: summary.total, label: copy.totalRequests, icon: 'file-text', surface: colorTokens.surfaceWarm },
    { value: summary.active, label: copy.activeRequests, icon: 'clock', surface: colorTokens.primarySoft },
    { value: summary.resolved, label: copy.resolvedRequests, icon: 'check', surface: colorTokens.successSoft },
  ];

  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View
          key={item.label}
          accessible
          accessibilityRole="summary"
          accessibilityLabel={`${item.label}: ${item.value}`}
          style={[styles.tile, fontScale > 1.2 && styles.tileScaled, { backgroundColor: item.surface }]}
        >
          <View style={styles.tileTop}>
            <Text style={styles.value}>{item.value}</Text>
            <View style={styles.iconFrame}>
              <Feather name={item.icon} size={14} color={colorTokens.primary} aria-hidden />
            </View>
          </View>
          <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.label}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tile: {
    ...componentShapes.compact,
    ...shadows.tile,
    minWidth: 0,
    minHeight: 86,
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  tileScaled: {
    minHeight: 98,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xxs,
  },
  value: {
    ...typography.number,
    color: colorTokens.textPrimary,
  },
  iconFrame: {
    ...componentShapes.icon,
    width: 24,
    height: 24,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.68)',
  },
  label: {
    ...typography.caption,
    color: colorTokens.textSecondary,
    marginTop: spacing.xs,
  },
});
