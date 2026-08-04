import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colorTokens = {
  primary: '#0B6E7A',
  primaryPressed: '#075662',
  primaryDark: '#073F47',
  primaryDeep: '#062F36',
  primarySoft: '#DFF1F0',
  primaryMist: '#EEF7F6',
  background: '#F5F8F7',
  surface: '#FFFFFF',
  surfaceSecondary: '#EDF4F3',
  textPrimary: '#092F36',
  textSecondary: '#61767B',
  textMuted: '#72858A',
  border: '#D4E1DF',
  borderStrong: '#B9CECB',
  success: '#15803D',
  successSoft: '#EEF9F3',
  warning: '#B45309',
  warningSoft: '#FFF3DF',
  danger: '#BE2233',
  dangerSoft: '#FCECEF',
  dangerBorder: '#F0C2C8',
  info: '#1F5FBF',
  infoSoft: '#EAF1FC',
  neutralStatus: '#6E6A66',
  neutralStatusSoft: '#F1F0EF',
  brass: '#D9A83C',
  white: '#FFFFFF',
  onDarkMuted: '#D5EAE8',
  onDarkBorder: 'rgba(255,255,255,0.14)',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  giant: 64,
} as const;

export const radii = {
  inner: 8,
  icon: 12,
  control: 14,
  compactCard: 18,
  card: 20,
  hero: 20,
  navigation: 18,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.55 },
  pageTitle: { fontSize: 27, lineHeight: 32, fontWeight: '700', letterSpacing: -0.35 },
  sectionTitle: { fontSize: 22, lineHeight: 27, fontWeight: '600', letterSpacing: -0.15 },
  cardTitle: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  supporting: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  button: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
  status: { fontSize: 11, lineHeight: 15, fontWeight: '600' },
  navigation: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
  number: { fontSize: 22, lineHeight: 26, fontWeight: '600', fontVariant: ['tabular-nums'] },
} as const satisfies Record<string, TextStyle>;

export const componentShapes = {
  leading: {
    borderTopLeftRadius: radii.hero,
    borderTopRightRadius: radii.hero,
    borderBottomRightRadius: radii.hero,
    borderBottomLeftRadius: radii.inner,
  },
  trailing: {
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    borderBottomRightRadius: radii.inner,
    borderBottomLeftRadius: radii.card,
  },
} as const satisfies Record<string, ViewStyle>;

export const shadows = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colorTokens.primaryDeep,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
    },
    android: { elevation: 1 },
    web: { boxShadow: '0 2px 8px rgba(6, 47, 54, 0.04)' },
    default: {},
  }),
  navigation: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colorTokens.primaryDeep,
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
    },
    android: { elevation: 3 },
    web: { boxShadow: '0 -3px 10px rgba(6, 47, 54, 0.06)' },
    default: {},
  }),
} as const;

export const motion = {
  pressScale: 0.98,
  pressDuration: 120,
  transitionDuration: 220,
} as const;
