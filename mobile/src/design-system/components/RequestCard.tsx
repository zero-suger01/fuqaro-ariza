import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { CitizenComplaint } from '@/api';
import type { Language } from '@/i18n';
import { useI18n } from '@/i18n';
import { getCabinetDesignCopy } from '@/design-system/copy';
import { getCitizenStatusLabel } from '@/design-system/status';
import { StatusChip } from '@/design-system/components/StatusChip';
import { colorTokens, componentShapes, motion, radii, shadows, spacing, typography } from '@/design-system/tokens';

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

const monthNames: Record<Language, string[]> = {
  uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
  oz: ['январ', 'феврал', 'март', 'апрел', 'май', 'июн', 'июл', 'август', 'сентябр', 'октабр', 'ноябр', 'декабр'],
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

function formatRequestDate(value: string, language: Language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  // API timestamps are UTC; Uzbekistan uses UTC+5 year-round.
  const tashkentDate = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  const day = tashkentDate.getUTCDate();
  const month = monthNames[language][tashkentDate.getUTCMonth()];
  const year = tashkentDate.getUTCFullYear();
  if (language === 'ru' || language === 'en') return `${day} ${month} ${year}`;
  return `${day}-${month}, ${year}`;
}

export function RequestCard({ complaint, onPress }: { complaint: CitizenComplaint; onPress: () => void }) {
  const { width } = useWindowDimensions();
  const { language } = useI18n();
  const copy = getCabinetDesignCopy(language);
  const categoryIcon = categoryIcons[complaint.category.code] ?? 'file-text';
  const statusLabel = getCitizenStatusLabel(complaint.status_simple, language);
  const categoryName = complaint.category.name;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${copy.requestNumber} ${complaint.ticket_number}. ${categoryName}. ${copy.statusPrefix}: ${statusLabel}`}
      accessibilityHint={copy.viewDetails}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <View style={styles.identity}>
          <View style={styles.iconFrame}>
            <Feather name={categoryIcon} size={19} color={colorTokens.primary} aria-hidden />
          </View>
          <View style={styles.ticketCopy}>
            <Text style={styles.ticketLabel}>{copy.requestNumber}</Text>
            <Text style={styles.ticket}>{complaint.ticket_number}</Text>
          </View>
        </View>
        {width >= 350 ? <StatusChip status={complaint.status_simple} compact style={styles.status} /> : null}
      </View>
      {width < 350 ? <StatusChip status={complaint.status_simple} compact style={styles.narrowStatus} /> : null}

      <Text style={styles.category}>{categoryName}</Text>
      <Text style={styles.description} numberOfLines={3}>
        {complaint.description || copy.summaryFallback}
      </Text>

      <View style={styles.meta}>
        <View style={styles.metaRow}>
          <Feather name="briefcase" size={15} color={colorTokens.textSecondary} aria-hidden />
          <Text style={styles.metaText} numberOfLines={2}>{complaint.department?.name || copy.organizationFallback}</Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name="calendar" size={15} color={colorTokens.textSecondary} aria-hidden />
          <Text style={styles.metaText}>{formatRequestDate(complaint.created_at, language)}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Text style={styles.action}>{copy.viewDetails}</Text>
        <Feather name="arrow-right" size={17} color={colorTokens.primary} aria-hidden />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...componentShapes.card,
    ...shadows.card,
    backgroundColor: colorTokens.surface,
    borderWidth: 1,
    borderColor: colorTokens.border,
    padding: spacing.lg,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: motion.pressScale }],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  identity: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconFrame: {
    width: 42,
    height: 42,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: radii.icon,
    borderTopRightRadius: radii.icon,
    borderBottomRightRadius: radii.icon,
    borderBottomLeftRadius: 6,
    backgroundColor: colorTokens.primaryMist,
  },
  ticketCopy: {
    minWidth: 0,
    flex: 1,
  },
  ticketLabel: {
    ...typography.caption,
    color: colorTokens.textSecondary,
  },
  ticket: {
    ...typography.bodyStrong,
    color: colorTokens.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.25,
  },
  status: {
    maxWidth: '55%',
  },
  narrowStatus: {
    maxWidth: '100%',
    marginTop: spacing.sm,
  },
  category: {
    ...typography.cardTitle,
    color: colorTokens.primary,
    marginTop: spacing.md,
  },
  description: {
    ...typography.body,
    color: colorTokens.textPrimary,
    marginTop: spacing.xs,
  },
  meta: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.caption,
    flex: 1,
    color: colorTokens.textSecondary,
  },
  actionRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  action: {
    ...typography.button,
    color: colorTokens.primary,
  },
});
