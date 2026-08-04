import { useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, G, Path, Pattern, Rect } from 'react-native-svg';
import { polygonPath, starPath } from './geometry';

type GirihFieldProps = {
  /** Stroke colour of the lattice. */
  color?: string;
  /** Peak opacity of the heaviest stroke. */
  opacity?: number;
  /** Tile edge in points. Larger reads calmer, smaller reads like textile. */
  tile?: number;
  /** Fill the star cores — reads as glazed tile rather than a window screen. */
  glazed?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Panjara — the octagon-and-star lattice cut into Uzbek window screens and
 * laid in Registan tilework. Rendered as a repeating SVG pattern so it stays
 * crisp at any surface size, and drawn at whisper opacity so it never competes
 * with content.
 *
 * The tile carries an octagon at each corner plus one at the centre; corner
 * shapes are drawn four times so neighbouring tiles complete each other.
 */
export function GirihField({
  color = '#FFFFFF',
  opacity = 0.09,
  tile = 92,
  glazed = false,
  style,
}: GirihFieldProps) {
  const patternId = `girih-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const half = tile / 2;
  const octagon = tile * 0.375;
  const star = octagon * 0.6;
  const knot = tile * 0.088;

  // Corners + centre: the checkerboard that makes the lattice interlock.
  const nodes: [number, number][] = [
    [0, 0],
    [tile, 0],
    [0, tile],
    [tile, tile],
    [half, half],
  ];
  // Interstitial squares sit where four octagons leave a gap.
  const knots: [number, number][] = [
    [half, 0],
    [0, half],
    [tile, half],
    [half, tile],
  ];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.field, style]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={patternId} width={tile} height={tile} patternUnits="userSpaceOnUse">
            <G>
              {nodes.map(([cx, cy]) => (
                <Path
                  key={`o${cx}-${cy}`}
                  d={polygonPath(cx, cy, octagon, 8, Math.PI / 8)}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.1}
                  strokeLinejoin="round"
                  opacity={opacity}
                />
              ))}
              {nodes.map(([cx, cy]) => (
                <Path
                  key={`s${cx}-${cy}`}
                  d={starPath(cx, cy, star, 8, 3, Math.PI / 8)}
                  fill={glazed ? color : 'none'}
                  fillOpacity={glazed ? opacity * 0.5 : 0}
                  stroke={color}
                  strokeWidth={0.9}
                  strokeLinejoin="round"
                  opacity={opacity * 0.85}
                />
              ))}
              {knots.map(([cx, cy]) => (
                <Path
                  key={`k${cx}-${cy}`}
                  d={polygonPath(cx, cy, knot, 4, Math.PI / 4)}
                  fill="none"
                  stroke={color}
                  strokeWidth={0.9}
                  strokeLinejoin="round"
                  opacity={opacity * 0.62}
                />
              ))}
            </G>
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${patternId})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { overflow: 'hidden', pointerEvents: 'none' },
});
