import { useId } from 'react';
import Svg, { Defs, G, LinearGradient, Path, Stop, type SvgProps } from 'react-native-svg';
import { ikatFlamePath, polygonPath } from './geometry';

type IkatBandProps = SvgProps & {
  width?: number;
  height?: number;
  color?: string;
  accent?: string;
  opacity?: number;
  /** Number of flames across the band. */
  repeat?: number;
};

/**
 * Abrbandi — "cloud binding". The warp is tied and dyed before weaving, so the
 * motif blooms outward with feathered edges. Used here as a section rule and a
 * decorative footer band.
 */
export function IkatBand({
  width = 320,
  height = 34,
  color = '#FFFFFF',
  accent,
  opacity = 1,
  repeat = 5,
  ...props
}: IkatBandProps) {
  const gradientId = `ikat-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const gold = accent ?? color;
  const step = width / repeat;
  const flameWidth = step * 0.78;
  const flameHeight = height * 0.72;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} {...props}>
      <Defs>
        {/* userSpaceOnUse so the fade runs across the whole band rather than
            restarting inside every flame's bounding box. */}
        <LinearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={0}
          x2={width}
          y2={0}
        >
          <Stop offset="0" stopColor={color} stopOpacity={0} />
          <Stop offset="0.22" stopColor={color} stopOpacity={0.85} />
          <Stop offset="0.5" stopColor={gold} stopOpacity={1} />
          <Stop offset="0.78" stopColor={color} stopOpacity={0.85} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <G opacity={opacity}>
        {Array.from({ length: repeat }, (_, i) => {
          const x = i * step + (step - flameWidth) / 2;
          const flipped = i % 2 === 1;
          return (
            <G
              key={i}
              transform={
                flipped
                  ? `translate(${x + flameWidth / 2} ${height / 2}) rotate(180) translate(${-(x + flameWidth / 2)} ${-height / 2})`
                  : undefined
              }
            >
              <Path
                d={ikatFlamePath(x, height * 0.14, flameWidth, flameHeight)}
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth={1.3}
                strokeLinejoin="round"
              />
            </G>
          );
        })}
        {Array.from({ length: repeat - 1 }, (_, i) => (
          <Path
            key={`d${i}`}
            d={polygonPath((i + 1) * step, height / 2, height * 0.12, 4, Math.PI / 4)}
            fill={gold}
            opacity={0.55}
          />
        ))}
      </G>
    </Svg>
  );
}

type GildedRuleProps = {
  width?: number;
  color?: string;
  opacity?: number;
};

/** A hairline with a girih lozenge at its centre — the quiet section divider. */
export function GildedRule({ width = 220, color = '#D3A63C', opacity = 1 }: GildedRuleProps) {
  const gradientId = `rule-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const height = 12;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        {/* A horizontal rule has a zero-height bounding box, so the default
            objectBoundingBox gradient degenerates and paints nothing. */}
        <LinearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={0}
          x2={width}
          y2={0}
        >
          <Stop offset="0" stopColor={color} stopOpacity={0} />
          <Stop offset="0.5" stopColor={color} stopOpacity={0.95} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <G opacity={opacity}>
        <Path
          d={`M0 ${height / 2}H${width}`}
          stroke={`url(#${gradientId})`}
          strokeWidth={1.4}
        />
        <Path d={polygonPath(width / 2, height / 2, 5, 4, Math.PI / 4)} fill={color} />
        <Path d={polygonPath(width / 2 - 16, height / 2, 2.4, 4, Math.PI / 4)} fill={color} opacity={0.6} />
        <Path d={polygonPath(width / 2 + 16, height / 2, 2.4, 4, Math.PI / 4)} fill={color} opacity={0.6} />
      </G>
    </Svg>
  );
}
