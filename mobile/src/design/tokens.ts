import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * "Registon" — e-Murojaat design language.
 *
 * The palette is lifted from Timurid architecture rather than from a generic
 * civic-blue template: turquoise from the Shohi Zinda domes, lapis from the
 * Registan portals, brass from the muqarnas gilding, and a warm ivory canvas
 * that reads like Samarkand paper instead of cold UI grey.
 */

export const palette = {
  /** Timurid dome turquoise — the primary voice of the product. */
  turquoise: {
    50: '#EAF7F5',
    100: '#CFECE8',
    200: '#9CD9D1',
    300: '#5FBFB4',
    400: '#2AA396',
    500: '#0E877A',
    600: '#0A6C62',
    700: '#08554E',
    800: '#06403B',
    900: '#042C29',
  },
  /** Registan portal lapis — depth, night surfaces, gradients. */
  lapis: {
    50: '#ECF1FB',
    100: '#D5E0F5',
    200: '#A8C0EA',
    300: '#7398D7',
    400: '#4571BE',
    500: '#2A539F',
    600: '#1E407F',
    700: '#173163',
    800: '#102246',
    900: '#0A1730',
    950: '#060E1F',
  },
  /** Muqarnas gilding — accent, honour, emphasis. Never a background. */
  brass: {
    50: '#FCF6E7',
    100: '#F7EACB',
    200: '#EFD696',
    300: '#E3BE5F',
    400: '#D3A63C',
    500: '#B4882A',
    600: '#8D6A20',
    700: '#654C17',
  },
  /** Anor — pomegranate, used for refusals and destructive intent. */
  anor: {
    50: '#FCEEEF',
    100: '#F8D9DC',
    300: '#E08590',
    500: '#B93A4B',
    600: '#962C3B',
  },
  /** Bogh — garden green for resolved states. */
  bogh: {
    50: '#EBF6EE',
    100: '#D3EBDB',
    500: '#2E7D4F',
    600: '#22623D',
  },
  /** Zafaron — saffron, for in-flight / attention states. */
  zafaron: {
    50: '#FFF5E4',
    100: '#FCE8C4',
    500: '#B87514',
    600: '#945D0F',
  },
  /** Warm neutrals. Ivory paper, never #FFF-on-#F5F5F5. */
  sand: {
    0: '#FFFDF9',
    50: '#FBF8F2',
    100: '#F5F1E8',
    200: '#EAE4D7',
    300: '#D9D1C0',
    400: '#B9AF9C',
  },
  /** Ink — deep petrol rather than black. */
  ink: {
    900: '#06222A',
    800: '#0A2E39',
    700: '#12414E',
    600: '#33606C',
    500: '#5B838D',
    400: '#8AA6AD',
  },
  white: '#FFFFFF',
} as const;

export const colors = {
  canvas: palette.sand[100],
  canvasDeep: palette.sand[200],
  surface: palette.sand[0],
  surfaceAlt: palette.sand[50],
  surfaceSunken: palette.sand[100],

  night: palette.lapis[950],
  nightAlt: palette.lapis[900],

  primary: palette.turquoise[500],
  primaryPressed: palette.turquoise[600],
  primaryDeep: palette.turquoise[700],
  primaryInk: palette.turquoise[800],
  primaryTint: palette.turquoise[50],
  primaryTintStrong: palette.turquoise[100],

  accent: palette.brass[400],
  accentSoft: palette.brass[300],
  accentTint: palette.brass[50],
  accentInk: palette.brass[700],

  text: palette.ink[900],
  textSecondary: palette.ink[600],
  textMuted: palette.ink[500],
  textFaint: palette.ink[400],
  onDark: palette.white,
  onDarkSoft: 'rgba(255,255,255,0.74)',
  onDarkFaint: 'rgba(255,255,255,0.48)',

  hairline: 'rgba(10,46,57,0.08)',
  hairlineStrong: 'rgba(10,46,57,0.14)',
  hairlineOnDark: 'rgba(255,255,255,0.14)',

  success: palette.bogh[500],
  successTint: palette.bogh[50],
  warning: palette.zafaron[500],
  warningTint: palette.zafaron[50],
  danger: palette.anor[500],
  dangerTint: palette.anor[50],
  info: palette.lapis[500],
  infoTint: palette.lapis[50],
} as const;

/** Gradient ramps. Consumed by expo-linear-gradient / react-native-svg. */
export const gradients = {
  /** Night sky over the madrasah — the signature hero surface. */
  night: [palette.lapis[950], palette.lapis[800], palette.turquoise[800]] as const,
  nightLocations: [0, 0.52, 1] as const,
  /** Dome — turquoise action surfaces. */
  dome: [palette.turquoise[400], palette.turquoise[600]] as const,
  /** Gilding — brass accents and hairlines. */
  gild: [palette.brass[200], palette.brass[400], palette.brass[600]] as const,
  /** Dawn — light warm wash under content. */
  dawn: ['rgba(255,253,249,0)', palette.sand[100]] as const,
  /** Glass edge highlight for elevated light cards. */
  sheen: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)'] as const,
} as const;

export const space = {
  '3xs': 2,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 52,
  '5xl': 68,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  '2xl': 34,
  '3xl': 42,
  pill: 999,
} as const;

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  black: 'Manrope_800ExtraBold',
} as const;

/**
 * Manrope runs optically large, so the scale leans on tight tracking and
 * generous leading instead of raw size.
 */
export const type = {
  displayXl: { fontFamily: fonts.black, fontSize: 40, lineHeight: 44, letterSpacing: -1.5 },
  display: { fontFamily: fonts.black, fontSize: 33, lineHeight: 38, letterSpacing: -1.1 },
  title1: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.7 },
  title2: { fontFamily: fonts.bold, fontSize: 21, lineHeight: 27, letterSpacing: -0.42 },
  title3: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 23, letterSpacing: -0.24 },
  bodyLg: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 25, letterSpacing: -0.1 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, letterSpacing: -0.05 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, letterSpacing: -0.12 },
  label: { fontFamily: fonts.semibold, fontSize: 13.5, lineHeight: 18, letterSpacing: -0.06 },
  caption: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17, letterSpacing: 0 },
  /** Eyebrows / section kickers. Always uppercase at the call site. */
  overline: { fontFamily: fonts.bold, fontSize: 10.5, lineHeight: 14, letterSpacing: 1.5 },
  button: { fontFamily: fonts.bold, fontSize: 15.5, lineHeight: 20, letterSpacing: -0.1 },
  numeral: {
    fontFamily: fonts.black,
    fontSize: 27,
    lineHeight: 31,
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  },
  mono: {
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.6,
    fontVariant: ['tabular-nums'],
  },
} as const satisfies Record<string, TextStyle>;

/**
 * Shadows are tinted with the ink colour rather than pure black — grey shadows
 * are the fastest way to make a warm palette look cheap.
 */
function shadow(y: number, blur: number, opacity: number, color: string = palette.ink[900]): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: { shadowColor: color, shadowOffset: { width: 0, height: y }, shadowOpacity: opacity, shadowRadius: blur },
    android: { elevation: Math.max(1, Math.round(y * 1.2)) },
    web: { boxShadow: `0 ${y}px ${blur}px rgba(6,34,42,${opacity})` },
    default: {},
  }) as ViewStyle;
}

export const elevation = {
  none: {} as ViewStyle,
  rest: shadow(2, 8, 0.05),
  card: shadow(8, 22, 0.07),
  raised: shadow(14, 34, 0.1),
  float: shadow(20, 44, 0.14),
  /** Coloured lift for primary actions — the glow that sells the press. */
  action: shadow(10, 22, 0.3, palette.turquoise[600]),
  gild: shadow(8, 18, 0.28, palette.brass[500]),
  navBar: Platform.select<ViewStyle>({
    ios: {
      shadowColor: palette.ink[900],
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.09,
      shadowRadius: 24,
    },
    android: { elevation: 16 },
    web: { boxShadow: '0 -6px 24px rgba(6,34,42,0.09)' },
    default: {},
  }) as ViewStyle,
} as const;

/** Continuous ("squircle") corners wherever the platform supports them. */
export const squircle = { borderCurve: 'continuous' } as const satisfies ViewStyle;

export const motion = {
  /** Reanimated spring presets. */
  press: { damping: 18, stiffness: 420, mass: 0.6 },
  gentle: { damping: 20, stiffness: 190, mass: 0.9 },
  snappy: { damping: 22, stiffness: 320, mass: 0.7 },
  bouncy: { damping: 12, stiffness: 260, mass: 0.8 },
  duration: { fast: 140, base: 240, slow: 420, ambient: 9000 },
  pressScale: 0.965,
  /** Stagger step for list/section entrances. */
  stagger: 62,
} as const;

export const layout = {
  gutter: space.lg,
  maxWidth: 640,
  navHeight: 66,
  headerHeight: 56,
  tapTarget: 48,
} as const;
