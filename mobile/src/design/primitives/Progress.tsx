import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { colors, motion, radius, squircle } from '../tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type RingProps = {
  /** 0…1 */
  value: number;
  size?: number;
  thickness?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
  delay?: number;
};

/**
 * Progress ring that sweeps into place. The arc is driven by `strokeDashoffset`
 * on the UI thread, so it stays smooth while the list behind it renders.
 */
export function ProgressRing({
  value,
  size = 76,
  thickness = 7,
  color = colors.accent,
  track = 'rgba(255,255,255,0.16)',
  children,
  delay = 220,
}: RingProps) {
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(Math.min(1, Math.max(0, value)), {
        duration: 1000,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [progress, value, delay]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.ring}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={track}
          strokeWidth={thickness}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={styles.ringLabel}>{children}</View>
    </View>
  );
}

type RailProps = {
  /** 0…1 */
  value: number;
  color?: string;
  trackColor?: string;
  height?: number;
  gradient?: readonly [string, string];
  style?: StyleProp<ViewStyle>;
  delay?: number;
};

/** Horizontal progress rail — the journey a request has travelled. */
export function ProgressRail({
  value,
  color = colors.primary,
  trackColor = colors.canvasDeep,
  height = 5,
  gradient,
  style,
  delay = 160,
}: RailProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withSpring(Math.min(1, Math.max(0, value)), motion.gentle));
  }, [progress, value, delay]);

  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View
      style={[
        squircle,
        styles.rail,
        { height, borderRadius: height, backgroundColor: trackColor },
        style,
      ]}
    >
      <Animated.View style={[styles.railFill, { borderRadius: height }, fill]}>
        {gradient ? (
          <LinearGradient
            colors={[...gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { transform: [{ rotate: '-90deg' }] },
  ringLabel: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rail: {
    width: '100%',
    overflow: 'hidden',
  },
  railFill: {
    height: '100%',
    overflow: 'hidden',
    borderTopRightRadius: radius.pill,
    borderBottomRightRadius: radius.pill,
  },
});
