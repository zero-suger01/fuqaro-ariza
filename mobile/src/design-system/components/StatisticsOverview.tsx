import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useI18n } from '@/i18n';
import { getCabinetDesignCopy } from '@/design-system/copy';
import { summarizeCitizenStatuses } from '@/design-system/status';
import { colorTokens, componentShapes, radii, spacing, typography } from '@/design-system/tokens';

type StatisticItem = {
  value: number;
  label: string;
  icon: keyof typeof Feather.glyphMap;
};

export function StatisticsOverview({ statuses }: { statuses: readonly string[] }) {
  const { language } = useI18n();
  const { width, fontScale } = useWindowDimensions();
  const copy = getCabinetDesignCopy(language);
  const summary = summarizeCitizenStatuses(statuses);
  const stacked = width < 340 || fontScale > 1.28;
  const items: StatisticItem[] = [
    { value: summary.total, label: copy.totalRequests, icon: 'file-text' },
    { value: summary.active, label: copy.activeRequests, icon: 'clock' },
    { value: summary.resolved, label: copy.resolvedRequests, icon: 'check-circle' },
  ];

  return (
    <View style={[styles.card, stacked && styles.cardStacked]}>
      {items.map((item, index) => (
        <View
          key={item.label}
          accessible
          accessibilityRole="summary"
          accessibilityLabel={`${item.label}: ${item.value}`}
          style={[
            styles.item,
            stacked && styles.itemStacked,
            index > 0 && (stacked ? styles.dividerStacked : styles.divider),
          ]}
        >
          <View style={styles.iconFrame}>
            <Feather name={item.icon} size={17} color={colorTokens.primary} aria-hidden />
          </View>
          <View style={stacked ? styles.stackedCopy : undefined}>
            <Text style={styles.value}>{item.value}</Text>
            <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.86} style={styles.label}>{item.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...componentShapes.overview,
    flexDirection: 'row',
    backgroundColor: colorTokens.surface,
    borderWidth: 1,
    borderColor: colorTokens.border,
    paddingVertical: spacing.md,
  },
  cardStacked: {
    flexDirection: 'column',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  item: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
  },
  itemStacked: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 0,
    paddingVertical: spacing.sm,
  },
  divider: {
    borderLeftWidth: 1,
    borderLeftColor: colorTokens.border,
  },
  dividerStacked: {
    borderTopWidth: 1,
    borderTopColor: colorTokens.border,
  },
  iconFrame: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: radii.icon,
    borderTopRightRadius: radii.icon,
    borderBottomRightRadius: radii.icon,
    borderBottomLeftRadius: 6,
    backgroundColor: colorTokens.primaryMist,
  },
  stackedCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  value: {
    ...typography.number,
    color: colorTokens.textPrimary,
    marginTop: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colorTokens.textSecondary,
    marginTop: 3,
    minHeight: 32,
  },
});
