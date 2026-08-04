import { useCallback } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '../tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type Feedback = 'light' | 'medium' | 'heavy' | 'select' | 'success' | 'warning' | 'error' | 'none';

export function tap(feedback: Feedback = 'light') {
  if (Platform.OS === 'web' || feedback === 'none') return;
  switch (feedback) {
    case 'select':
      void Haptics.selectionAsync();
      return;
    case 'success':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    case 'warning':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    case 'error':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    case 'medium':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    case 'heavy':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      return;
    default:
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export type TouchableProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** How far the surface sinks on press. 1 = no movement. */
  scale?: number;
  /** Opacity at rest-to-pressed. */
  dim?: number;
  haptic?: Feedback;
};

/**
 * The single press surface for the app: a physical spring rather than the
 * default opacity blink, plus a haptic tick so actions land in the hand as
 * well as on the screen.
 */
export function Touchable({
  style,
  scale = motion.pressScale,
  dim = 1,
  haptic = 'light',
  onPressIn,
  onPressOut,
  disabled,
  ...props
}: TouchableProps) {
  const pressed = useSharedValue(0);

  // Disabled dimming lives inside the animated style: a plain style object
  // after it in the array still loses to the worklet's `opacity`.
  const animated = useAnimatedStyle(
    () => ({
      transform: [{ scale: 1 - pressed.value * (1 - scale) }],
      opacity: (disabled ? 0.42 : 1) - pressed.value * (1 - dim),
    }),
    [disabled, scale, dim],
  );

  const handleIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (event) => {
      pressed.value = withSpring(1, motion.press);
      tap(haptic);
      onPressIn?.(event);
    },
    [pressed, haptic, onPressIn],
  );

  const handleOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (event) => {
      pressed.value = withSpring(0, motion.gentle);
      onPressOut?.(event);
    },
    [pressed, onPressOut],
  );

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={handleIn}
      onPressOut={handleOut}
      style={[style, animated]}
    />
  );
}

/** Spring value helper for one-off transitions outside Touchable. */
export const springTo = (value: number) => withSpring(value, motion.snappy);
export const fadeTo = (value: number) => withTiming(value, { duration: motion.duration.base });
