import { useId, type CSSProperties, type ReactElement } from "react";

export type GlyphVariant = "gamepad" | "bars" | "d20" | "coins" | "pen";

// Frames sit side by side in one SVG and are stepped through like a sprite sheet.
// The jz-filmstrip keyframes in index.css shift by GLYPH_FRAMES * GLYPH_CELL.
export const GLYPH_FRAMES = 12;
export const GLYPH_CELL = 24;

const STROKE = "currentColor";

const rad = (deg: number) => (deg * Math.PI) / 180;

const at = (
  cx: number,
  cy: number,
  r: number,
  deg: number,
): [number, number] => [
  cx + r * Math.cos(rad(deg)),
  cy + r * Math.sin(rad(deg)),
];

const poly = (points: [number, number][]) =>
  points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

const D20_FACES = [20, 7, 13, 2, 18, 5, 11, 9, 16, 3, 14, 8];

// The silhouette wobbles while the facets and numeral snap to new angles, so the
// die reads as tumbling onto a different face rather than spinning in place.
const d20Frame = (i: number): ReactElement => {
  const t = i / GLYPH_FRAMES;
  const spin = t * 360;
  const wobble = Math.sin(t * Math.PI * 2) * 9;
  const bob = Math.sin(t * Math.PI * 4) * 1.1;
  const hex = [0, 60, 120, 180, 240, 300].map((a) =>
    at(12, 12, 9.6, a + wobble),
  );
  const tri = [90, 210, 330].map((a) => at(12, 12, 6.4, a + spin));

  return (
    <g transform={`translate(0 ${bob.toFixed(2)})`}>
      <polygon
        points={poly(hex)}
        fill="none"
        stroke={STROKE}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {tri.map((v, k) => {
        const corner =
          (((Math.round((90 + 120 * k + spin) / 60) % 6) + 6) % 6) * 60;
        const [hx, hy] = at(12, 12, 9.6, corner + wobble);
        return (
          <line
            key={k}
            x1={v[0].toFixed(2)}
            y1={v[1].toFixed(2)}
            x2={hx.toFixed(2)}
            y2={hy.toFixed(2)}
            stroke={STROKE}
            strokeWidth={1}
            opacity={0.55}
          />
        );
      })}
      <polygon
        points={poly(tri)}
        fill="none"
        stroke={STROKE}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <text
        x={12}
        y={13}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={7.5}
        fontWeight={700}
        fill={STROKE}
        stroke="none"
      >
        {D20_FACES[i]}
      </text>
    </g>
  );
};

const barsFrame = (i: number): ReactElement => {
  const t = i / GLYPH_FRAMES;
  const xs = [3.4, 8.4, 13.4, 18.4];

  return (
    <g>
      {xs.map((x, b) => {
        const h =
          3.5 + 10 * (0.5 + 0.5 * Math.sin((t + b * 0.12) * Math.PI * 2));
        return (
          <rect
            key={b}
            x={x}
            y={(20.4 - h).toFixed(2)}
            width={3.4}
            height={h.toFixed(2)}
            rx={1}
            fill={STROKE}
            opacity={0.85}
          />
        );
      })}
      <line
        x1={2}
        y1={21.2}
        x2={22}
        y2={21.2}
        stroke={STROKE}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </g>
  );
};

const gamepadFrame = (i: number): ReactElement => {
  const t = i / GLYPH_FRAMES;
  const shake = Math.sin(t * Math.PI * 6) * 0.5;
  const pressed = i % 3;

  return (
    <g transform={`translate(${shake.toFixed(2)} 0)`}>
      <rect
        x={2.6}
        y={8}
        width={18.8}
        height={9.4}
        rx={4.7}
        fill="none"
        stroke={STROKE}
        strokeWidth={1.5}
      />
      <path
        d="M7.75 10.45 h1.5 v1.55 h1.55 v1.5 h-1.55 v1.55 h-1.5 v-1.55 h-1.55 v-1.5 h1.55 z"
        fill={pressed === 0 ? STROKE : "none"}
        stroke={STROKE}
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
      <circle
        cx={16.4}
        cy={11.4}
        r={1.5}
        fill={pressed === 1 ? STROKE : "none"}
        stroke={STROKE}
        strokeWidth={0.9}
      />
      <circle
        cx={18.6}
        cy={14.4}
        r={1.5}
        fill={pressed === 2 ? STROKE : "none"}
        stroke={STROKE}
        strokeWidth={0.9}
      />
    </g>
  );
};

const coinsFrame = (i: number): ReactElement => {
  const t = i / GLYPH_FRAMES;
  const belly = (16.1 + Math.sin(t * Math.PI * 2) * 0.5).toFixed(2);

  return (
    <g>
      {[0, 1].map((c) => {
        const phase = (t + 0.25 + c * 0.5) % 1;
        const lift = Math.sin(phase * Math.PI);
        return (
          <circle
            key={c}
            cx={c === 0 ? 7 : 17}
            cy={(8.4 - 5 * lift).toFixed(2)}
            r={1.5}
            fill="none"
            stroke={STROKE}
            strokeWidth={1.1}
            opacity={(0.35 + 0.65 * lift).toFixed(2)}
          />
        );
      })}
      <path
        d="M9.5 9 L8.8 5.8 H15.2 L14.5 9"
        fill="none"
        stroke={STROKE}
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d={`M9.5 9 C6 11.2 4.5 13.6 4.5 ${belly} C4.5 19.2 8 20.6 12 20.6 C16 20.6 19.5 19.2 19.5 ${belly} C19.5 13.6 18 11.2 14.5 9 Z`}
        fill="none"
        stroke={STROKE}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <text
        x={12}
        y={16}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={7}
        fontWeight={700}
        fill={STROKE}
        stroke="none"
      >
        $
      </text>
    </g>
  );
};

const penFrame = (i: number): ReactElement => {
  const p = i / GLYPH_FRAMES;
  const dx = -3 + 11 * p;

  return (
    <g>
      {p > 0.01 && (
        <line
          x1={3.6}
          y1={19.4}
          x2={(3.6 + 11 * p).toFixed(2)}
          y2={19.4}
          stroke={STROKE}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      )}
      <g transform={`translate(${dx.toFixed(2)} 0)`}>
        <path
          d="M14.6 3.6 L18.4 7.4 L10.4 15.4 L6.2 16.6 L7.4 12.4 Z"
          fill="none"
          stroke={STROKE}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <line
          x1={7.4}
          y1={12.4}
          x2={10.4}
          y2={15.4}
          stroke={STROKE}
          strokeWidth={1.1}
          opacity={0.7}
        />
      </g>
    </g>
  );
};

const FRAME_BUILDERS: Record<GlyphVariant, (i: number) => ReactElement> = {
  gamepad: gamepadFrame,
  bars: barsFrame,
  d20: d20Frame,
  coins: coinsFrame,
  pen: penFrame,
};

interface AnimatedGlyphProps {
  variant: GlyphVariant;
  size?: number;
  speed?: string;
}

const AnimatedGlyph = ({
  variant,
  size = 34,
  speed = "0.85s",
}: AnimatedGlyphProps) => {
  const clipId = useId();
  const buildFrame = FRAME_BUILDERS[variant];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${GLYPH_CELL} ${GLYPH_CELL}`}
      aria-hidden="true"
      focusable="false"
      style={
        { "--jz-glyph-duration": speed, overflow: "hidden" } as CSSProperties
      }
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={GLYPH_CELL} height={GLYPH_CELL} />
        </clipPath>
      </defs>
      <g className="jz-glyph-strip">
        {Array.from({ length: GLYPH_FRAMES }, (_, i) => (
          <g key={i} transform={`translate(${i * GLYPH_CELL} 0)`}>
            {/* Clip per cell so a frame can never bleed into its neighbour. */}
            <g clipPath={`url(#${clipId})`}>{buildFrame(i)}</g>
          </g>
        ))}
      </g>
    </svg>
  );
};

export default AnimatedGlyph;
