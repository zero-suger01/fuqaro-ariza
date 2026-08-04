import { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, useDerivedValue, withSpring } from 'react-native-reanimated';
import { useI18n } from '@/i18n';
import {
  GirihStar,
  Glass,
  Touchable,
  Txt,
  colors,
  elevation,
  layout,
  motion,
  palette,
  radius,
  space,
  squircle,
} from '@/design';

export type CabinetTab = 'home' | 'complaints' | 'new' | 'notifications' | 'settings';

type Slot = { key: CabinetTab; label: string; icon: keyof typeof Feather.glyphMap };
type Box = { x: number; width: number };

/**
 * A floating glass bar with the compose action raised out of it. The active
 * indicator is measured rather than assumed, so it lands correctly whatever
 * the label lengths are across four languages.
 */
export function BottomNav({
  active,
  onChange,
}: {
  active: CabinetTab;
  onChange?: (tab: CabinetTab) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useI18n();
  const [boxes, setBoxes] = useState<Record<string, Box>>({});

  // Five caps labels across a 320pt screen leaves ~52pt per slot; the wider
  // tracking that makes the overline feel considered has to go at that size.
  const labelStyle = width < 360 ? styles.labelTight : styles.labelWide;

  const slots: Slot[] = [
    { key: 'home', label: t.nav.home, icon: 'home' },
    { key: 'complaints', label: t.nav.requests, icon: 'file-text' },
    { key: 'new', label: t.nav.create, icon: 'plus' },
    { key: 'notifications', label: t.nav.alerts, icon: 'bell' },
    { key: 'settings', label: t.nav.settings, icon: 'sliders' },
  ];

  const measure = useCallback(
    (key: string) => (event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      setBoxes((current) =>
        current[key]?.x === x && current[key]?.width === width
          ? current
          : { ...current, [key]: { x, width } },
      );
    },
    [],
  );

  const target = boxes[active];
  const offset = useDerivedValue(() => withSpring(target?.x ?? 0, motion.snappy), [target?.x]);
  const size = useDerivedValue(() => withSpring(target?.width ?? 0, motion.snappy), [target?.width]);

  const indicator = useAnimatedStyle(() => ({
    opacity: target ? 1 : 0,
    width: size.value,
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View
      style={[styles.dock, { paddingBottom: Math.max(insets.bottom, space.sm) }]}
      pointerEvents="box-none"
    >
      <Glass round="2xl" intensity={44} style={[styles.bar, elevation.navBar]}>
        <Animated.View style={[squircle, styles.indicator, indicator]} pointerEvents="none" />

        {slots.map((slot) => {
          const selected = active === slot.key;

          // The raised action only reserves its footprint and label here; the
          // button itself is drawn outside the bar, which clips its children.
          if (slot.key === 'new') {
            return (
              <View key={slot.key} style={styles.fabSlot}>
                <Txt
                  variant="overline"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  maxFontSizeMultiplier={1.2}
                  style={[styles.fabLabel, labelStyle]}
                  caps
                >
                  {slot.label}
                </Txt>
              </View>
            );
          }

          return (
            <Pressable
              key={slot.key}
              onLayout={measure(slot.key)}
              onPress={() => onChange?.(slot.key)}
              accessibilityRole="tab"
              accessibilityLabel={slot.label}
              accessibilityState={{ selected }}
              style={styles.slot}
            >
              <Feather
                name={slot.icon}
                size={20}
                color={selected ? colors.primaryDeep : colors.textMuted}
              />
              <Txt
                variant="overline"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                maxFontSizeMultiplier={1.2}
                style={[styles.label, labelStyle, selected && styles.labelActive]}
                caps
              >
                {slot.label}
              </Txt>
            </Pressable>
          );
        })}
      </Glass>

      <View style={styles.fabLayer} pointerEvents="box-none">
        <Touchable
          onPress={() => router.push('/complaint')}
          haptic="medium"
          scale={0.92}
          accessibilityRole="button"
          accessibilityLabel={t.cabinet.heroTitle}
          style={[styles.fab, elevation.action]}
        >
          <LinearGradient
            colors={[palette.turquoise[400], palette.turquoise[600]]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <GirihStar size={11} color="rgba(255,255,255,0.55)" style={styles.fabStar} />
          <Feather name="plus" size={24} color={colors.onDark} />
        </Touchable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    paddingHorizontal: space.sm,
    paddingTop: space.xs,
  },
  bar: {
    height: layout.navHeight,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.xxs,
  },
  indicator: {
    position: 'absolute',
    top: space.xxs,
    bottom: space.xxs,
    left: 0,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryTint,
  },
  slot: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 2,
  },
  label: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  labelWide: {
    fontSize: 10.5,
    letterSpacing: 0.4,
  },
  labelTight: {
    fontSize: 9,
    letterSpacing: 0,
  },
  labelActive: {
    color: colors.primaryDeep,
  },
  fabSlot: {
    flex: 1.15,
    minWidth: 0,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    // Lines the label up with the other slots' labels, which sit 14pt off the
    // bar's bottom edge once their icon + gap + label block is centred.
    paddingBottom: 14,
  },
  fabLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  fab: {
    ...squircle,
    width: 54,
    height: 54,
    marginTop: -12,
    borderRadius: 27,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.canvas,
  },
  fabStar: {
    position: 'absolute',
    top: 7,
    right: 9,
  },
  fabLabel: {
    color: colors.primaryDeep,
    textAlign: 'center',
  },
});
