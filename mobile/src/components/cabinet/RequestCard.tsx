import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { CitizenComplaint } from '@/api';
import { useI18n, type Language } from '@/i18n';
import {
  Badge,
  ProgressRail,
  Touchable,
  Txt,
  colors,
  elevation,
  getStatus,
  getStatusLabel,
  radius,
  space,
  squircle,
} from '@/design';

const categoryIcons: Record<string, keyof typeof Feather.glyphMap> = {
  elektr: 'zap',
  gaz: 'wind',
  suv_kanalizatsiya: 'droplet',
  obodonlashtirish: 'sun',
  chiqindi: 'trash-2',
  uy_joy: 'home',
  yol: 'map',
  yol_harakati: 'navigation',
  jamoat_transporti: 'truck',
  ekologiya: 'feather',
  yer_kadastr: 'map-pin',
  qurilish: 'tool',
  sogliqni_saqlash: 'heart',
  talim: 'book-open',
  ijtimoiy_yordam: 'users',
  jamoat_xavfsizlik: 'shield',
  favqulodda: 'alert-triangle',
  ijro: 'check-square',
  fhdyo_hujjatlar: 'file-text',
  soliq: 'briefcase',
  mehnat: 'user-check',
  isteomolchi: 'shopping-bag',
  hokimlik: 'compass',
  mahalla: 'grid',
};

const months: Record<Language, string[]> = {
  uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
  oz: ['январ', 'феврал', 'март', 'апрел', 'май', 'июн', 'июл', 'август', 'сентябр', 'октабр', 'ноябр', 'декабр'],
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** Tashkent runs at UTC+5 year round, so the offset is a constant. */
function formatDate(value: string, language: Language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const local = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  const day = local.getUTCDate();
  const month = months[language][local.getUTCMonth()];
  if (language === 'ru' || language === 'en') return `${day} ${month}`;
  return `${day}-${month}`;
}

export function RequestCard({
  complaint,
  onPress,
}: {
  complaint: CitizenComplaint;
  onPress: () => void;
}) {
  const { language, t } = useI18n();
  const status = getStatus(complaint.status_simple);
  const statusLabel = getStatusLabel(complaint.status_simple, language);
  const icon = categoryIcons[complaint.category.code] ?? 'file-text';

  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t.cabinet.ticket} ${complaint.ticket_number}. ${complaint.category.name}. ${t.cabinet.statusPrefix}: ${statusLabel}`}
      accessibilityHint={t.cabinet.details}
      style={[squircle, styles.card, elevation.card]}
    >
      {/* Status rail: the whole list becomes scannable by colour alone. */}
      <LinearGradient
        colors={[status.accent, `${status.accent}66`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.rail}
      />

      <View style={styles.body}>
        <View style={styles.head}>
          <View style={styles.iconFrame}>
            <Feather name={icon} size={16} color={colors.primary} />
          </View>
          <Txt variant="mono" tone="muted" numberOfLines={1} style={styles.ticket}>
            {complaint.ticket_number}
          </Txt>
          <Badge
            label={statusLabel}
            color={status.color}
            background={status.background}
            dot
            style={styles.badge}
          />
        </View>

        <Txt variant="title3" numberOfLines={2} maxFontSizeMultiplier={1.4} style={styles.category}>
          {complaint.category.name}
        </Txt>
        <Txt variant="body" tone="secondary" numberOfLines={2} maxFontSizeMultiplier={1.4}>
          {complaint.description || t.cabinet.textFallback}
        </Txt>

        <ProgressRail
          value={status.progress}
          color={status.accent}
          height={4}
          style={styles.progress}
        />

        <View style={styles.foot}>
          <Txt variant="caption" tone="muted" numberOfLines={1} style={styles.org}>
            {complaint.department?.name || t.cabinet.orgFallback}
          </Txt>
          <Txt variant="caption" tone="faint" numberOfLines={1}>
            {formatDate(complaint.created_at, language)}
          </Txt>
          <Feather name="chevron-right" size={16} color={colors.textFaint} />
        </View>
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderColor: colors.hairline,
  },
  rail: { width: 4 },
  body: {
    flex: 1,
    minWidth: 0,
    padding: space.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  iconFrame: {
    ...squircle,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xs + 2,
    backgroundColor: colors.primaryTint,
  },
  ticket: { flex: 1, minWidth: 0 },
  badge: { maxWidth: '48%', flexShrink: 1 },
  category: { marginTop: space.sm, marginBottom: space['3xs'] },
  progress: { marginTop: space.sm },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.sm,
  },
  org: { flex: 1, minWidth: 0 },
});
