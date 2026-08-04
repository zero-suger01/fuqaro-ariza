import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colorTokens = {
  primary: '#0D7377',
  primaryPressed: '#0A6266',
  primaryDark: '#084A50',
  primaryDeep: '#063C41',
  primarySoft: '#E7F4F3',
  primaryMist: '#F0F8F7',
  background: '#F6F9F8',
  surface: '#FFFFFF',
  surfaceWarm: '#FBFCFC',
  surfaceSecondary: '#F1F6F5',
  textPrimary: '#0B343A',
  textSecondary: '#6F8387',
  textMuted: '#87989B',
  border: '#DCE8E6',
  borderStrong: '#C7DAD7',
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
  brass: '#C2A162',
  white: '#FFFFFF',
  onDarkMuted: '#CFE3E1',
  onDarkBorder: 'rgba(255,255,255,0.12)',
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
  inner: 10,
  icon: 15,
  control: 16,
  compactCard: 20,
  card: 24,
  hero: 26,
  navigation: 22,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.55 },
  pageTitle: { fontSize: 27, lineHeight: 32, fontWeight: '700', letterSpacing: -0.35 },
  sectionTitle: { fontSize: 21, lineHeight: 26, fontWeight: '600', letterSpacing: -0.15 },
  cardTitle: { fontSize: 18, lineHeight: 23, fontWeight: '600', letterSpacing: -0.1 },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  supporting: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  button: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
  status: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  navigation: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
  number: { fontSize: 21, lineHeight: 25, fontWeight: '700', fontVariant: ['tabular-nums'] },
} as const satisfies Record<string, TextStyle>;

export const componentShapes = {
  surface: {
    borderRadius: radii.card,
    borderCurve: 'continuous',
  },
  compact: {
    borderRadius: radii.compactCard,
    borderCurve: 'continuous',
  },
  icon: {
    borderRadius: radii.icon,
    borderCurve: 'continuous',
  },
} as const satisfies Record<string, ViewStyle>;

export const shadows = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colorTokens.primaryDeep,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.07,
      shadowRadius: 16,
    },
    android: { elevation: 2 },
    web: { boxShadow: '0 6px 16px rgba(8, 74, 80, 0.07)' },
    default: {},
  }),
  tile: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colorTokens.primaryDark,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
    },
    android: { elevation: 1 },
    web: { boxShadow: '0 3px 10px rgba(8, 74, 80, 0.04)' },
    default: {},
  }),
  navigation: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colorTokens.primaryDeep,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.07,
      shadowRadius: 14,
    },
    android: { elevation: 4 },
    web: { boxShadow: '0 -4px 14px rgba(8, 74, 80, 0.07)' },
    default: {},
  }),
} as const;

export const motion = {
  pressScale: 0.98,
  pressDuration: 120,
  transitionDuration: 220,
} as const;
