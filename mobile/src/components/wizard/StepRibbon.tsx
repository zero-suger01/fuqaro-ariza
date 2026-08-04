import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, motion, palette, radius, space, squircle } from '@/design';

/**
 * One segment per step, each filling on a spring. A single long bar hides how
 * much is left; discrete segments tell you there are exactly three.
 */
export function StepRibbon({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: total, now: step }}>
      {Array.from({ length: total }, (_, index) => (
        <Segment key={index} filled={index < step} active={index === step - 1} />
      ))}
    </View>
  );
}

function Segment({ filled, active }: { filled: boolean; active: boolean }) {
  const progress = useDerivedValue(() => withSpring(filled ? 1 : 0, motion.gentle), [filled]);

  const fill = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
    opacity: progress.value === 0 ? 0 : 1,
  }));

  return (
    <View style={[squircle, styles.segment, active && styles.segmentActive]}>
      <Animated.View style={[styles.fill, fill]}>
        <LinearGradient
          colors={[palette.turquoise[400], palette.turquoise[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.xxs,
  },
  segment: {
    flex: 1,
    height: 5,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.canvasDeep,
  },
  segmentActive: {
    backgroundColor: colors.primaryTintStrong,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    transformOrigin: 'left',
  },
});
