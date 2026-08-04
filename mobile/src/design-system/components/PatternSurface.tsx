import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { colorTokens } from '@/design-system/tokens';

type PatternSurfaceProps = {
  variant?: 'light' | 'dark';
  opacity?: number;
  style?: StyleProp<ViewStyle>;
};

/** Original interlocking octagon-and-arch lattice for restrained civic surfaces. */
export function PatternSurface({ variant = 'dark', opacity, style }: PatternSurfaceProps) {
  const stroke = variant === 'dark' ? colorTokens.white : colorTokens.primary;
  const patternOpacity = opacity ?? (variant === 'dark' ? 0.075 : 0.045);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.hidden, style]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <Pattern id="uzbek-civic-grid" width="72" height="72" patternUnits="userSpaceOnUse">
            <Path
              d="M36 4 52 12 68 28 60 44 44 60 28 52 12 36 20 20 36 4Zm0 16 16 16-16 16-16-16 16-16ZM36 4V-8M68 28h12M44 60l8 8M12 36H0M20 20l-8-8M60 44l8 8"
              fill="none"
              stroke={stroke}
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={patternOpacity}
            />
            <Path
              d="M20 20h32M12 36h56M28 52h32"
              fill="none"
              stroke={stroke}
              strokeWidth="0.8"
              strokeLinecap="round"
              opacity={patternOpacity * 0.72}
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#uzbek-civic-grid)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { overflow: 'hidden', pointerEvents: 'none' },
});
