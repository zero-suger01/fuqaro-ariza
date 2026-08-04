import type { Feather } from '@expo/vector-icons';
import type { Language } from '@/i18n';
import { colors, palette } from './tokens';

export const citizenStatusCodes = [
  'qabul_qilindi',
  'korilmoqda',
  'ijroda',
  'yakunlandi',
  'rad_etildi',
] as const;

export type CitizenStatusCode = (typeof citizenStatusCodes)[number];

export type StatusDefinition = {
  icon: keyof typeof Feather.glyphMap;
  /** Foreground for text and icon. */
  color: string;
  /** Tinted chip background. */
  background: string;
  /** Saturated colour for rails, dots and gradients. */
  accent: string;
  phase: 'active' | 'resolved' | 'rejected' | 'unknown';
  /** Position on the citizen-facing journey, 0…1. Drives progress rails. */
  progress: number;
  labels: Record<Language, string>;
};

export const citizenStatusDefinitions: Record<CitizenStatusCode, StatusDefinition> = {
  qabul_qilindi: {
    icon: 'inbox',
    color: palette.lapis[600],
    background: palette.lapis[50],
    accent: palette.lapis[500],
    phase: 'active',
    progress: 0.25,
    labels: { uz: 'Qabul qilindi', oz: 'Қабул қилинди', ru: 'Принято', en: 'Received' },
  },
  korilmoqda: {
    icon: 'eye',
    color: palette.turquoise[700],
    background: palette.turquoise[50],
    accent: palette.turquoise[500],
    phase: 'active',
    progress: 0.5,
    labels: { uz: 'Koʻrilmoqda', oz: 'Кўрилмоқда', ru: 'На рассмотрении', en: 'Under review' },
  },
  ijroda: {
    icon: 'tool',
    color: palette.zafaron[600],
    background: palette.zafaron[50],
    accent: palette.brass[400],
    phase: 'active',
    progress: 0.75,
    labels: { uz: 'Ijroda', oz: 'Ижрода', ru: 'В работе', en: 'In progress' },
  },
  yakunlandi: {
    icon: 'check-circle',
    color: palette.bogh[600],
    background: palette.bogh[50],
    accent: palette.bogh[500],
    phase: 'resolved',
    progress: 1,
    labels: { uz: 'Yakunlandi', oz: 'Якунланди', ru: 'Завершено', en: 'Completed' },
  },
  rad_etildi: {
    icon: 'x-circle',
    color: palette.anor[600],
    background: palette.anor[50],
    accent: palette.anor[500],
    phase: 'rejected',
    progress: 1,
    labels: { uz: 'Rad etildi', oz: 'Рад этилди', ru: 'Отклонено', en: 'Rejected' },
  },
};

const unknownStatus: StatusDefinition = {
  icon: 'help-circle',
  color: colors.textSecondary,
  background: colors.canvasDeep,
  accent: colors.textMuted,
  phase: 'unknown',
  progress: 0.1,
  labels: {
    uz: 'Holat yangilanmoqda',
    oz: 'Ҳолат янгиланмоқда',
    ru: 'Статус обновляется',
    en: 'Status updating',
  },
};

export function isCitizenStatusCode(value: string): value is CitizenStatusCode {
  return citizenStatusCodes.includes(value as CitizenStatusCode);
}

export function getStatus(value: string): StatusDefinition {
  return isCitizenStatusCode(value) ? citizenStatusDefinitions[value] : unknownStatus;
}

export function getStatusLabel(value: string, language: Language): string {
  return getStatus(value).labels[language];
}

export function summarizeStatuses(statuses: readonly string[]) {
  return statuses.reduce(
    (summary, status) => {
      const { phase } = getStatus(status);
      if (phase === 'active') summary.active += 1;
      if (phase === 'resolved' || phase === 'rejected') summary.resolved += 1;
      return summary;
    },
    { total: statuses.length, active: 0, resolved: 0 },
  );
}
