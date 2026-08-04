import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useI18n } from '@/i18n';
import {
  Card,
  CountUp,
  NightPanel,
  ProgressRing,
  Txt,
  colors,
  palette,
  space,
  summarizeStatuses,
  type as typeScale,
} from '@/design';

/**
 * Bento: one dark anchor tile carrying the headline number and the resolved
 * ratio, with two lighter tiles stacked beside it. Equal-weight tiles would
 * make the reader hunt for the important figure.
 */
export function StatBento({ statuses }: { statuses: readonly string[] }) {
  const { t } = useI18n();
  const summary = summarizeStatuses(statuses);
  const ratio = summary.total > 0 ? summary.resolved / summary.total : 0;

  return (
    <View style={styles.grid}>
      <NightPanel round="xl" pattern="quiet" glow={false} style={styles.anchor}>
        <View
          accessible
          accessibilityRole="summary"
          accessibilityLabel={`${t.cabinet.total}: ${summary.total}. ${t.cabinet.progressLabel}: ${Math.round(ratio * 100)}%`}
          style={styles.anchorInner}
        >
          <ProgressRing
            value={ratio}
            size={82}
            thickness={7}
            color={palette.brass[300]}
            track="rgba(255,255,255,0.14)"
          >
            <CountUp value={summary.total} style={[typeScale.numeral, styles.anchorNumber]} />
          </ProgressRing>

          <View style={styles.anchorCopy}>
            <Txt variant="overline" tone="onDarkFaint" caps numberOfLines={1}>
              {t.cabinet.total}
            </Txt>
            <Txt variant="caption" tone="onDarkSoft" numberOfLines={2} style={styles.anchorHint}>
              {summary.total > 0
                ? `${Math.round(ratio * 100)}% · ${t.cabinet.resolved}`
                : t.cabinet.progressLabel}
            </Txt>
          </View>
        </View>
      </NightPanel>

      <View style={styles.column}>
        <Tile
          value={summary.active}
          label={t.cabinet.active}
          icon="loader"
          tint={colors.warningTint}
          ink={colors.warning}
        />
        <Tile
          value={summary.resolved}
          label={t.cabinet.resolved}
          icon="check"
          tint={colors.successTint}
          ink={colors.success}
        />
      </View>
    </View>
  );
}

function Tile({
  value,
  label,
  icon,
  tint,
  ink,
}: {
  value: number;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  tint: string;
  ink: string;
}) {
  return (
    <Card
      round="lg"
      padded="sm"
      lift="rest"
      style={styles.tile}
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={styles.tileHead}>
        <CountUp value={value} style={[typeScale.title2, styles.tileNumber]} />
        <View style={[styles.tileIcon, { backgroundColor: tint }]}>
          <Feather name={icon} size={13} color={ink} />
        </View>
      </View>
      <Txt variant="caption" tone="muted" numberOfLines={1} maxFontSizeMultiplier={1.3}>
        {label}
      </Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: space.xs,
  },
  anchor: {
    flex: 1.15,
    minWidth: 0,
    padding: space.md,
    justifyContent: 'space-between',
  },
  anchorInner: {
    alignItems: 'flex-start',
    gap: space.sm,
  },
  anchorNumber: {
    color: colors.onDark,
    textAlign: 'center',
  },
  anchorCopy: { width: '100%' },
  anchorHint: { marginTop: 1 },
  column: {
    flex: 1,
    minWidth: 0,
    gap: space.xs,
  },
  tile: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'space-between',
  },
  tileHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.xxs,
  },
  tileNumber: { color: colors.text },
  tileIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
