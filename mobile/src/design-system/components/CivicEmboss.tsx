import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colorTokens } from '@/design-system/tokens';

/** Single abstract civic geometry. Decorative, faint, never repeated. */
export function CivicEmboss() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.frame}
    >
      <Svg width="112" height="112" viewBox="0 0 112 112">
        <Path
          d="M56 5 81 18l26 25-13 25-26 26-25-13-25-25 13-26L56 5Zm0 20 18 9 13 13-9 18-13 13-18-9-13-13 9-18 13-13Zm0 15 16 16-16 16-16-16 16-16Z"
          fill="none"
          stroke={colorTokens.white}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    top: -26,
    right: -20,
    width: 112,
    height: 112,
    opacity: 0.045,
    pointerEvents: 'none',
  },
});
