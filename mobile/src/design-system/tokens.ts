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
  inner: 12,
  icon: 14,
  control: 16,
  compactCard: 20,
  card: 24,
  hero: 28,
  navigation: 30,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.7 },
  pageTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.45 },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.2 },
  cardTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  supporting: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  button: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  status: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  navigation: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
  number: { fontSize: 26, lineHeight: 30, fontWeight: '700', fontVariant: ['tabular-nums'] },
} as const satisfies Record<string, TextStyle>;

export const componentShapes = {
  hero: {
    borderTopLeftRadius: radii.hero,
    borderTopRightRadius: radii.hero,
    borderBottomRightRadius: radii.hero,
    borderBottomLeftRadius: radii.inner,
  },
  card: {
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    borderBottomRightRadius: radii.inner,
    borderBottomLeftRadius: radii.card,
  },
  overview: {
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    borderBottomRightRadius: radii.card,
    borderBottomLeftRadius: radii.inner,
  },
} as const satisfies Record<string, ViewStyle>;

export const shadows = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colorTokens.primaryDeep,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 18,
    },
    android: { elevation: 2 },
    web: { boxShadow: '0 8px 18px rgba(6, 47, 54, 0.06)' },
    default: {},
  }),
  navigation: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colorTokens.primaryDeep,
      shadowOffset: { width: 0, height: 9 },
      shadowOpacity: 0.15,
      shadowRadius: 22,
    },
    android: { elevation: 9 },
    web: { boxShadow: '0 9px 22px rgba(6, 47, 54, 0.15)' },
    default: {},
  }),
} as const;

export const motion = {
  pressScale: 0.98,
  pressDuration: 120,
  transitionDuration: 220,
} as const;
