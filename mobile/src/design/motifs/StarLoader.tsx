import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { polygonPath, starPath } from './geometry';
import { colors } from '../tokens';

type StarLoaderProps = {
  size?: number;
  color?: string;
  accent?: string;
  label?: string;
};

/**
 * Two girih stars turning against each other — the same construction a tile
 * setter uses to lay a rosette, borrowed as a loading indicator so waiting
 * still feels like part of the product.
 */
export function StarLoader({
  size = 44,
  color = colors.primary,
  accent = colors.accent,
  label,
}: StarLoaderProps) {
  const spin = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1, false);
  }, [spin]);

  const outer = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const inner = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * -360}deg` }] }));

  const c = size / 2;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={{ width: size, height: size }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, outer]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Path
            d={starPath(c, c, c * 0.96, 8, 3)}
            fill="none"
            stroke={color}
            strokeWidth={size * 0.055}
            strokeLinejoin="round"
            opacity={0.9}
          />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, inner]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Path
            d={polygonPath(c, c, c * 0.5, 4, Math.PI / 4)}
            fill="none"
            stroke={accent}
            strokeWidth={size * 0.05}
            strokeLinejoin="round"
          />
          <Circle cx={c} cy={c} r={size * 0.055} fill={accent} />
        </Svg>
      </Animated.View>
    </View>
  );
}
