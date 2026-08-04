import Svg, { Circle, G, Path, type SvgProps } from 'react-native-svg';
import { petalPath, starPath, tendrilPath } from './geometry';

type SuzaniBloomProps = SvgProps & {
  size?: number;
  color?: string;
  /** Secondary colour for the inner rings — brass against turquoise reads best. */
  accent?: string;
  opacity?: number;
  /** Solid petals instead of outlines. */
  filled?: boolean;
};

/**
 * Palak — the great circular medallion embroidered at the centre of a Bukhara
 * suzani: a seeded core, a ring of almond petals, a counter-ring of half
 * petals, and islimi tendrils curling into the ground.
 */
export function SuzaniBloom({
  size = 168,
  color = '#FFFFFF',
  accent,
  opacity = 1,
  filled = false,
  ...props
}: SuzaniBloomProps) {
  const c = size / 2;
  const gold = accent ?? color;
  const outerPetals = 12;
  const innerPetals = 8;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} {...props}>
      <G opacity={opacity}>
        {/* Islimi tendrils reaching out of the medallion. */}
        {Array.from({ length: 6 }, (_, i) => (
          <Path
            key={`t${i}`}
            d={tendrilPath(c, c, c * 0.94, (i * Math.PI) / 3 + Math.PI / 12, Math.PI / 3.4)}
            fill="none"
            stroke={color}
            strokeWidth={size * 0.008}
            strokeLinecap="round"
            opacity={0.4}
          />
        ))}

        {/* Outer ring of almond petals. */}
        {Array.from({ length: outerPetals }, (_, i) => {
          const angle = (i * 2 * Math.PI) / outerPetals - Math.PI / 2;
          return (
            <Path
              key={`p${i}`}
              d={petalPath(c, c, c * 0.44, c * 0.86, angle, Math.PI / outerPetals, 0.62)}
              fill={filled ? color : 'none'}
              fillOpacity={filled ? 0.16 : 0}
              stroke={color}
              strokeWidth={size * 0.009}
              strokeLinejoin="round"
              opacity={0.78}
            />
          );
        })}

        {/* Counter-ring, offset by half a step so the rings interlock. */}
        {Array.from({ length: innerPetals }, (_, i) => {
          const angle = (i * 2 * Math.PI) / innerPetals - Math.PI / 2 + Math.PI / innerPetals;
          return (
            <Path
              key={`ip${i}`}
              d={petalPath(c, c, c * 0.2, c * 0.42, angle, Math.PI / (innerPetals * 1.3), 0.7)}
              fill={filled ? gold : 'none'}
              fillOpacity={filled ? 0.22 : 0}
              stroke={gold}
              strokeWidth={size * 0.008}
              strokeLinejoin="round"
              opacity={0.9}
            />
          );
        })}

        <Circle cx={c} cy={c} r={c * 0.44} fill="none" stroke={color} strokeWidth={size * 0.006} opacity={0.34} />
        <Circle cx={c} cy={c} r={c * 0.2} fill="none" stroke={gold} strokeWidth={size * 0.007} opacity={0.6} />

        {/* Seeded core — the eight-point girih star at the heart. */}
        <Path
          d={starPath(c, c, c * 0.16, 8, 3)}
          fill={gold}
          fillOpacity={filled ? 0.9 : 0.45}
          stroke={gold}
          strokeWidth={size * 0.006}
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
}
