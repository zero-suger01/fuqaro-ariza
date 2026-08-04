import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, withSpring } from 'react-native-reanimated';
import { languages, useI18n, type Language } from '@/i18n';
import { colors, motion, radius, space, squircle, tap, Txt, type } from '@/design';

type LanguageSwitchProps = {
  tone?: 'onDark' | 'light';
  style?: StyleProp<ViewStyle>;
};

/**
 * Segmented language control. The selected pill slides between segments on a
 * spring rather than cutting, which is the difference between "a settings row"
 * and "a control you enjoy pressing".
 */
export function LanguageSwitch({ tone = 'onDark', style }: LanguageSwitchProps) {
  const { language, setLanguage } = useI18n();
  const [trackWidth, setTrackWidth] = useState(0);
  const onDark = tone === 'onDark';

  const index = Math.max(0, languages.findIndex((item) => item.code === language));
  const segment = trackWidth > 0 ? trackWidth / languages.length : 0;
  const offset = useDerivedValue(() => withSpring(index * segment, motion.snappy), [index, segment]);

  const indicator = useAnimatedStyle(() => ({
    width: segment,
    transform: [{ translateX: offset.value }],
  }));

  const onLayout = (event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width);

  const select = (code: Language) => {
    tap('select');
    setLanguage(code);
  };

  return (
    <View
      onLayout={onLayout}
      accessibilityRole="radiogroup"
      style={[squircle, styles.track, onDark ? styles.trackDark : styles.trackLight, style]}
    >
      {segment > 0 ? (
        <Animated.View
          style={[
            squircle,
            styles.indicator,
            onDark ? styles.indicatorDark : styles.indicatorLight,
            indicator,
          ]}
        />
      ) : null}

      {languages.map((item) => {
        const selected = item.code === language;
        const tint = selected
          ? onDark
            ? colors.night
            : colors.onDark
          : onDark
            ? colors.onDarkSoft
            : colors.textSecondary;
        return (
          <Pressable
            key={item.code}
            onPress={() => select(item.code)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={item.label}
            style={styles.segment}
          >
            <Txt
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
              style={[type.caption, styles.segmentLabel, { color: tint }]}
            >
              {item.short}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    padding: 3,
  },
  trackDark: {
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  trackLight: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.hairline,
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: radius.pill,
  },
  indicatorDark: {
    backgroundColor: colors.onDark,
  },
  indicatorLight: {
    backgroundColor: colors.primary,
  },
  segment: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space['3xs'],
  },
  segmentLabel: {
    textAlign: 'center',
  },
});
