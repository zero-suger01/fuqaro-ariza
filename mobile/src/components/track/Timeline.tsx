import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { TrackResult } from '@/api';
import { useI18n, type Language } from '@/i18n';
import {
  GirihStar,
  Reveal,
  Txt,
  colors,
  getStatus,
  getStatusLabel,
  palette,
  space,
  squircle,
} from '@/design';

type Entry = TrackResult['timeline'][number];

function formatMoment(value: string | null, language: Language) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  const day = String(local.getUTCDate()).padStart(2, '0');
  const month = String(local.getUTCMonth() + 1).padStart(2, '0');
  const hours = String(local.getUTCHours()).padStart(2, '0');
  const minutes = String(local.getUTCMinutes()).padStart(2, '0');
  return language === 'en'
    ? `${day}/${month} · ${hours}:${minutes}`
    : `${day}.${month} · ${hours}:${minutes}`;
}

/**
 * The journey rendered as a rail: completed nodes carry a girih star, the rail
 * between them is gilded up to the point the request has actually reached, and
 * everything ahead stays quiet.
 */
export function Timeline({ entries }: { entries: Entry[] }) {
  const { language } = useI18n();
  const lastDone = entries.reduce((last, entry, index) => (entry.done ? index : last), -1);

  return (
    <View>
      {entries.map((entry, index) => {
        const status = getStatus(entry.step);
        const isLast = index === entries.length - 1;
        const railDone = index < lastDone;
        const isCurrent = index === lastDone;

        return (
          <Reveal key={`${entry.step}-${index}`} index={index} from={10} style={styles.row}>
            <View style={styles.gutter}>
              <View
                style={[
                  squircle,
                  styles.node,
                  entry.done && styles.nodeDone,
                  isCurrent && styles.nodeCurrent,
                ]}
              >
                {entry.done ? (
                  <GirihStar size={13} color={colors.onDark} />
                ) : (
                  <View style={styles.nodeDot} />
                )}
              </View>

              {!isLast ? (
                <View style={styles.rail}>
                  {railDone ? (
                    <LinearGradient
                      colors={[palette.turquoise[500], palette.brass[300]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={[styles.copy, isLast && styles.copyLast]}>
              <Txt
                variant={entry.done ? 'bodyStrong' : 'body'}
                tone={entry.done ? 'default' : 'muted'}
                numberOfLines={2}
              >
                {getStatusLabel(entry.step, language)}
              </Txt>
              {entry.at ? (
                <Txt variant="caption" tone="faint" numberOfLines={1} style={styles.moment}>
                  {formatMoment(entry.at, language)}
                </Txt>
              ) : null}
            </View>

            {isCurrent ? (
              <View style={[styles.pulse, { backgroundColor: status.background }]}>
                <Feather name={status.icon} size={13} color={status.color} />
              </View>
            ) : null}
          </Reveal>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  gutter: {
    width: 26,
    alignItems: 'center',
  },
  node: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.canvasDeep,
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  nodeDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  nodeCurrent: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  nodeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.textFaint,
  },
  rail: {
    flex: 1,
    width: 2.5,
    minHeight: 26,
    overflow: 'hidden',
    borderRadius: 2,
    backgroundColor: colors.canvasDeep,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    paddingBottom: space.lg,
  },
  copyLast: { paddingBottom: 0 },
  moment: { marginTop: 1 },
  pulse: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
});
