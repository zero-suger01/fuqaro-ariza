import { useEffect, type PropsWithChildren } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, motion, radius, squircle } from '../tokens';

type RevealProps = PropsWithChildren<{
  /** Index in a list — multiplied by the stagger step. */
  index?: number;
  delay?: number;
  /** Travel distance in points. Negative slides down from above. */
  from?: number;
  style?: StyleProp<ViewStyle>;
}>;

/**
 * Entrance for content blocks: a short rise with a soft spring, staggered down
 * the page so a screen assembles itself instead of appearing all at once.
 */
export function Reveal({ children, index = 0, delay = 0, from = 18, style }: RevealProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    // Capped so a long list does not leave its last rows invisible for
    // seconds — past ~7 items the stagger has already done its job.
    const stagger = Math.min(index, 7) * motion.stagger;
    progress.value = withDelay(delay + stagger, withSpring(1, motion.gentle));
  }, [progress, delay, index]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * from }],
  }));

  return <Animated.View style={[animated, style]}>{children}</Animated.View>;
}

/** Ambient float — used sparingly on hero ornament so the screen breathes. */
export function Drift({
  children,
  amplitude = 7,
  duration = motion.duration.ambient,
  style,
}: PropsWithChildren<{ amplitude?: number; duration?: number; style?: StyleProp<ViewStyle> }>) {
  const phase = useSharedValue(0);

  useEffect(() => {
    phase.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [phase, duration]);

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateY: (phase.value - 0.5) * amplitude * 2 },
      { rotate: `${(phase.value - 0.5) * 5}deg` },
    ],
  }));

  return <Animated.View style={[animated, style]}>{children}</Animated.View>;
}

const AnimatedInput = Animated.createAnimatedComponent(TextInput);

/**
 * Tally that counts up to its value. Reanimated cannot drive `children`, so the
 * number rides on a read-only TextInput's `text` prop — the standard way to
 * animate glyphs on the UI thread.
 */
export function CountUp({
  value,
  style,
  duration = 900,
  delay = 120,
}: {
  value: number;
  style?: StyleProp<TextStyle>;
  duration?: number;
  delay?: number;
}) {
  const current = useSharedValue(0);

  useEffect(() => {
    current.value = withDelay(
      delay,
      withTiming(value, { duration, easing: Easing.out(Easing.cubic) }),
    );
  }, [current, value, duration, delay]);

  const animatedProps = useAnimatedProps(() => ({
    text: String(Math.round(current.value)),
    defaultValue: String(Math.round(current.value)),
  }));

  // The input is a rendering trick, not a control — keep it out of the
  // accessibility tree and let the surrounding tile carry the label.
  return (
    <AnimatedInput
      editable={false}
      focusable={false}
      pointerEvents="none"
      accessible={false}
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      underlineColorAndroid="transparent"
      style={[styles.countUp, style]}
      animatedProps={animatedProps as never}
    />
  );
}

/** Loading placeholder with a light sweep. */
export function Skeleton({
  width,
  height = 16,
  round = 'sm',
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  round?: keyof typeof radius;
  style?: StyleProp<ViewStyle>;
}) {
  const sweep = useSharedValue(0);

  useEffect(() => {
    sweep.value = withRepeat(withTiming(1, { duration: 1250, easing: Easing.inOut(Easing.quad) }), -1, false);
  }, [sweep]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: `${-100 + sweep.value * 200}%` }],
  }));

  return (
    <View
      style={[
        squircle,
        styles.skeleton,
        { width, height, borderRadius: radius[round] },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animated]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.85)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  countUp: {
    padding: 0,
    margin: 0,
    borderWidth: 0,
  },
  skeleton: {
    overflow: 'hidden',
    backgroundColor: colors.canvasDeep,
  },
});
