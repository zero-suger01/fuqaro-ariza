import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CitizenComplaint } from '@/api';
import type { Language } from '@/i18n';
import { useI18n } from '@/i18n';
import { getCabinetDesignCopy } from '@/design-system/copy';
import { getCitizenStatusLabel } from '@/design-system/status';
import { StatusChip } from '@/design-system/components/StatusChip';
import { colorTokens, componentShapes, motion, shadows, spacing, typography } from '@/design-system/tokens';

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
  const tashkentDate = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  const day = tashkentDate.getUTCDate();
  const month = monthNames[language][tashkentDate.getUTCMonth()];
  const year = tashkentDate.getUTCFullYear();
  if (language === 'ru' || language === 'en') return `${day} ${month} ${year}`;
  return `${day}-${month}, ${year}`;
}

export function RequestCard({ complaint, onPress }: { complaint: CitizenComplaint; onPress: () => void }) {
  const { language } = useI18n();
  const copy = getCabinetDesignCopy(language);
  const categoryName = complaint.category.name;
  const statusLabel = getCitizenStatusLabel(complaint.status_simple, language);
  const categoryIcon = categoryIcons[complaint.category.code] ?? 'file-text';

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
            <Feather name={categoryIcon} size={17} color={colorTokens.primary} aria-hidden />
          </View>
          <Text numberOfLines={1} ellipsizeMode="middle" style={styles.ticket}>#{complaint.ticket_number}</Text>
        </View>
        <StatusChip status={complaint.status_simple} compact style={styles.status} />
      </View>

      <Text numberOfLines={1} style={styles.category}>{categoryName}</Text>
      <Text numberOfLines={2} style={styles.description}>
        {complaint.description || copy.summaryFallback}
      </Text>

      <View style={styles.footer}>
        <View style={styles.metadata}>
          <Text numberOfLines={1} style={styles.organization}>
            {complaint.department?.name || copy.organizationFallback}
          </Text>
          <Text style={styles.date}>{formatRequestDate(complaint.created_at, language)}</Text>
        </View>
        <View style={styles.chevronFrame}>
          <Feather name="chevron-right" size={18} color={colorTokens.primary} aria-hidden />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...componentShapes.surface,
    ...shadows.card,
    backgroundColor: colorTokens.surfaceWarm,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.93,
    transform: [{ scale: motion.pressScale }],
  },
  topRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  identity: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconFrame: {
    ...componentShapes.icon,
    width: 34,
    height: 34,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorTokens.primarySoft,
  },
  ticket: {
    ...typography.label,
    flexShrink: 1,
    color: colorTokens.textSecondary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  status: {
    maxWidth: '49%',
    flexShrink: 1,
  },
  category: {
    ...typography.cardTitle,
    color: colorTokens.textPrimary,
    marginTop: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colorTokens.textSecondary,
    marginTop: spacing.xxs,
  },
  footer: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  metadata: {
    minWidth: 0,
    flex: 1,
  },
  organization: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: colorTokens.textSecondary,
  },
  date: {
    ...typography.caption,
    color: colorTokens.textMuted,
    marginTop: 2,
  },
  chevronFrame: {
    ...componentShapes.icon,
    width: 32,
    height: 32,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorTokens.primaryMist,
  },
});
