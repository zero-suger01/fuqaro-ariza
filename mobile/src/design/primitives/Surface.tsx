import { useCallback, useId, useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { GirihField } from '../motifs';
import { colors, elevation, gradients, palette, radius, space, squircle } from '../tokens';

type CardProps = PropsWithChildren<
  Pick<ViewProps, 'accessible' | 'accessibilityRole' | 'accessibilityLabel'> & {
    style?: StyleProp<ViewStyle>;
    /** Visual weight. `none` has no shadow, `float` is the modal/FAB tier. */
    lift?: keyof typeof elevation;
    /** Corner radius token. */
    round?: keyof typeof radius;
    padded?: boolean | keyof typeof space;
    tone?: 'surface' | 'alt' | 'sunken' | 'tint' | 'accentTint';
    bordered?: boolean;
  }
>;

const cardTones = {
  surface: colors.surface,
  alt: colors.surfaceAlt,
  sunken: colors.surfaceSunken,
  tint: colors.primaryTint,
  accentTint: colors.accentTint,
} as const;

/** The default light surface: warm ivory, hairline edge, ink-tinted shadow. */
export function Card({
  children,
  style,
  lift = 'card',
  round = 'lg',
  padded = 'md',
  tone = 'surface',
  bordered = true,
  ...accessibility
}: CardProps) {
  const pad = padded === true ? space.md : padded === false ? 0 : space[padded];
  return (
    <View
      {...accessibility}
      style={[
        squircle,
        elevation[lift],
        {
          backgroundColor: cardTones[tone],
          borderRadius: radius[round],
          padding: pad,
        },
        bordered && { borderWidth: StyleSheet.hairlineWidth * 1.5, borderColor: colors.hairline },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type NightPanelProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  round?: keyof typeof radius;
  /** Ornament density on the panel. */
  pattern?: 'none' | 'quiet' | 'full';
  /** Warm brass glow in the corner, for hero surfaces. */
  glow?: boolean;
  /** Brass hairline along the top edge. */
  gilded?: boolean;
  overlay?: ReactNode;
}>;

/**
 * The signature dark surface — night over a madrasah courtyard. A lapis→
 * turquoise ramp, two soft light sources bled in with radial gradients (RN has
 * no mesh gradient, so the mesh is assembled by hand), and the panjara lattice
 * laid on top at whisper opacity.
 */
export function NightPanel({
  children,
  style,
  round = 'xl',
  pattern = 'full',
  glow = true,
  gilded = false,
  overlay,
}: NightPanelProps) {
  const glowId = `glow-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const coolId = `cool-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [size, setSize] = useState({ width: 0, height: 0 });

  const measure = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) =>
      current.width === width && current.height === height ? current : { width, height },
    );
  }, []);

  return (
    <View
      onLayout={glow ? measure : undefined}
      style={[squircle, styles.night, { borderRadius: radius[round] }, style]}
    >
      <LinearGradient
        colors={[...gradients.night]}
        locations={[...gradients.nightLocations]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {glow && size.width > 0 ? (
        // Every coordinate here is an absolute point value measured from the
        // panel itself. Percentages, viewBox scaling and objectBoundingBox
        // gradients all resolve differently between react-native-svg's web and
        // Android backends, which is what kept sliding these glows around; a
        // full-bleed rect painted with a userSpaceOnUse gradient leaves the
        // renderer nothing to interpret.
        <Svg
          width={size.width}
          height={size.height}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            {/* Warm light behind the ornament, cool light washing the floor —
                brass over turquoise would silt into olive, so they stay apart. */}
            <RadialGradient
              id={glowId}
              gradientUnits="userSpaceOnUse"
              cx={size.width * 0.86}
              cy={size.height * 0.08}
              rx={size.width * 0.54}
              ry={size.height * 0.46}
            >
              <Stop offset="0" stopColor={palette.brass[300]} stopOpacity={0.34} />
              <Stop offset="1" stopColor={palette.brass[300]} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient
              id={coolId}
              gradientUnits="userSpaceOnUse"
              cx={size.width * 0.08}
              cy={size.height * 0.94}
              rx={size.width * 0.6}
              ry={size.height * 0.5}
            >
              <Stop offset="0" stopColor={palette.turquoise[300]} stopOpacity={0.55} />
              <Stop offset="1" stopColor={palette.turquoise[300]} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={size.width} height={size.height} fill={`url(#${glowId})`} />
          <Rect x={0} y={0} width={size.width} height={size.height} fill={`url(#${coolId})`} />
        </Svg>
      ) : null}

      {pattern !== 'none' ? (
        <GirihField
          color={palette.white}
          opacity={pattern === 'full' ? 0.1 : 0.055}
          tile={pattern === 'full' ? 96 : 128}
          glazed={pattern === 'full'}
        />
      ) : null}

      {gilded ? (
        <LinearGradient
          colors={['rgba(227,190,95,0)', 'rgba(227,190,95,0.85)', 'rgba(227,190,95,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gild}
        />
      ) : null}

      {overlay}
      <View style={styles.nightContent}>{children}</View>
    </View>
  );
}

type GlassProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  round?: keyof typeof radius;
}>;

/**
 * Frosted surface for chrome that floats over content. Falls back to a solid
 * translucent fill on platforms where the blur is unavailable.
 */
export function Glass({ children, style, intensity = 34, tint = 'light', round = 'lg' }: GlassProps) {
  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      experimentalBlurMethod="dimezisBlurView"
      style={[
        squircle,
        styles.glass,
        {
          borderRadius: radius[round],
          backgroundColor: tint === 'dark' ? 'rgba(8,21,44,0.42)' : 'rgba(255,253,249,0.62)',
          borderColor: tint === 'dark' ? colors.hairlineOnDark : 'rgba(255,255,255,0.7)',
        },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}

/** Hairline divider. */
export function Divider({ style, onDark = false }: { style?: StyleProp<ViewStyle>; onDark?: boolean }) {
  return (
    <View
      style={[
        {
          height: StyleSheet.hairlineWidth * 1.5,
          backgroundColor: onDark ? colors.hairlineOnDark : colors.hairline,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  night: {
    overflow: 'hidden',
    backgroundColor: colors.night,
  },
  nightContent: {
    position: 'relative',
  },
  gild: {
    position: 'absolute',
    top: 0,
    left: '8%',
    right: '8%',
    height: 1.5,
  },
  glass: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
});
