import type { Feather } from '@expo/vector-icons';
import type { Language } from '@/i18n';
import { colorTokens } from '@/design-system/tokens';

export const citizenStatusCodes = [
  'qabul_qilindi',
  'korilmoqda',
  'ijroda',
  'yakunlandi',
  'rad_etildi',
] as const;

export type CitizenStatusCode = (typeof citizenStatusCodes)[number];

type StatusDefinition = {
  icon: keyof typeof Feather.glyphMap;
  foreground: string;
  background: string;
  indicator: string;
  phase: 'active' | 'resolved' | 'rejected' | 'unknown';
  labels: Record<Language, string>;
};

export const citizenStatusDefinitions: Record<CitizenStatusCode, StatusDefinition> = {
  qabul_qilindi: {
    icon: 'inbox',
    foreground: colorTokens.neutralStatus,
    background: colorTokens.neutralStatusSoft,
    indicator: colorTokens.neutralStatus,
    phase: 'active',
    labels: { uz: 'Qabul qilindi', oz: 'Қабул қилинди', ru: 'Принято', en: 'Received' },
  },
  korilmoqda: {
    icon: 'eye',
    foreground: colorTokens.info,
    background: colorTokens.infoSoft,
    indicator: colorTokens.info,
    phase: 'active',
    labels: { uz: 'Ko‘rib chiqilmoqda', oz: 'Кўриб чиқилмоқда', ru: 'На рассмотрении', en: 'Under review' },
  },
  ijroda: {
    icon: 'clock',
    foreground: colorTokens.primary,
    background: colorTokens.primarySoft,
    indicator: colorTokens.primary,
    phase: 'active',
    labels: { uz: 'Ijroda', oz: 'Ижрода', ru: 'В работе', en: 'In progress' },
  },
  yakunlandi: {
    icon: 'check-circle',
    foreground: colorTokens.success,
    background: colorTokens.successSoft,
    indicator: colorTokens.success,
    phase: 'resolved',
    labels: { uz: 'Yakunlandi', oz: 'Якунланди', ru: 'Завершено', en: 'Completed' },
  },
  rad_etildi: {
    icon: 'x-circle',
    foreground: colorTokens.danger,
    background: colorTokens.dangerSoft,
    indicator: colorTokens.danger,
    phase: 'rejected',
    labels: { uz: 'Rad etildi', oz: 'Рад этилди', ru: 'Отклонено', en: 'Rejected' },
  },
};

const unknownStatus: StatusDefinition = {
  icon: 'help-circle',
  foreground: colorTokens.textSecondary,
  background: colorTokens.surfaceSecondary,
  indicator: colorTokens.textSecondary,
  phase: 'unknown',
  labels: { uz: 'Holat yangilanmoqda', oz: 'Ҳолат янгиланмоқда', ru: 'Статус обновляется', en: 'Status updating' },
};

export function isCitizenStatusCode(value: string): value is CitizenStatusCode {
  return citizenStatusCodes.includes(value as CitizenStatusCode);
}

export function getCitizenStatusDefinition(value: string): StatusDefinition {
  return isCitizenStatusCode(value) ? citizenStatusDefinitions[value] : unknownStatus;
}

export function getCitizenStatusLabel(value: string, language: Language): string {
  return getCitizenStatusDefinition(value).labels[language];
}

export function isActiveCitizenStatus(value: string): boolean {
  return getCitizenStatusDefinition(value).phase === 'active';
}

export function isResolvedCitizenStatus(value: string): boolean {
  return isCitizenStatusCode(value) && citizenStatusDefinitions[value].phase === 'resolved';
}

export function summarizeCitizenStatuses(statuses: readonly string[]) {
  return statuses.reduce(
    (summary, status) => {
      const phase = getCitizenStatusDefinition(status).phase;
      if (phase === 'active') summary.active += 1;
      if (phase === 'resolved') summary.resolved += 1;
      return summary;
    },
    { total: statuses.length, active: 0, resolved: 0 },
  );
}
