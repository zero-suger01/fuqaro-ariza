import { useId } from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop, type SvgProps } from 'react-native-svg';
import { archPath, pakhtaPath, polygonPath, starPath } from './geometry';

type MarkProps = SvgProps & {
  size?: number;
  color?: string;
  accent?: string;
};

/**
 * Pakhta — the open cotton boll. Four broad lobes with four narrow ones
 * showing between them, seeded with a small girih star.
 */
export function PakhtaMark({ size = 28, color = '#FFFFFF', accent, ...props }: MarkProps) {
  const c = size / 2;
  const gold = accent ?? color;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} {...props}>
      <Path d={pakhtaPath(c, c, c * 0.92)} fill={color} fillRule="evenodd" opacity={0.92} />
      <Circle cx={c} cy={c} r={c * 0.22} fill={gold} />
    </Svg>
  );
}

/**
 * The product mark: a peshtoq portal holding an eight-point star, framed by
 * the arch of a madrasah façade. Reads as a seal at 28pt and as a monument at
 * 96pt.
 */
export function EmblemMark({ size = 44, color = '#FFFFFF', accent, ...props }: MarkProps) {
  const gradientId = `emblem-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const gold = accent ?? color;
  const w = size;
  const h = size;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${w} ${h}`} {...props}>
      <Defs>
        <LinearGradient id={gradientId} x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor={gold} stopOpacity={1} />
          <Stop offset="1" stopColor={gold} stopOpacity={0.55} />
        </LinearGradient>
      </Defs>
      <G>
        <Path
          d={archPath(w * 0.12, h * 0.06, w * 0.76, h * 0.88)}
          fill="none"
          stroke={color}
          strokeWidth={size * 0.055}
          strokeLinejoin="round"
          opacity={0.95}
        />
        <Path
          d={archPath(w * 0.27, h * 0.22, w * 0.46, h * 0.72)}
          fill={color}
          opacity={0.14}
        />
        <Path
          d={starPath(w / 2, h * 0.47, size * 0.19, 8, 3)}
          fill={`url(#${gradientId})`}
          stroke={gold}
          strokeWidth={size * 0.02}
          strokeLinejoin="round"
        />
        <Path
          d={`M${w * 0.2} ${h * 0.94}H${w * 0.8}`}
          stroke={gold}
          strokeWidth={size * 0.05}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}

/** Standalone girih star — bullets, node markers, decorative punctuation. */
export function GirihStar({ size = 16, color = '#D3A63C', accent, ...props }: MarkProps) {
  const c = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} {...props}>
      <Path d={starPath(c, c, c * 0.94, 8, 3)} fill={color} strokeLinejoin="round" />
      {accent ? <Path d={polygonPath(c, c, c * 0.3, 4, Math.PI / 4)} fill={accent} /> : null}
    </Svg>
  );
}
