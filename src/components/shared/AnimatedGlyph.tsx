import { useId, type CSSProperties, type ReactElement } from "react";

export type GlyphVariant = "gamepad" | "bars" | "d20" | "coins" | "pen";

// Frames sit side by side in one SVG and are stepped through like a sprite sheet.
export const GLYPH_CELL = 24;

const VARIANT_FRAMES: Record<GlyphVariant, number> = {
  gamepad: 12,
  bars: 12,
  d20: 20,
  coins: 12,
  pen: 12,
};

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

const D20_FACES = [20, 7, 2, 18, 11, 5, 16, 9];

// Frames spent tumbling before the die lands; the rest hold the result so it can be read.
const D20_TUMBLE = 12;

// A die flips face over face and decelerates rather than rotating evenly. The face group
// squashes to an edge and swaps numerals while it's hidden, which is what separates a
// tumble from a wheel spin.
const d20Frame = (i: number, frames: number): ReactElement => {
  let faceScale: number;
  let face: number;
  let lean: number;
  let lift: number;

  if (i < D20_TUMBLE) {
    const u = i / D20_TUMBLE;
    const eased = 1 - Math.pow(1 - u, 1.7);
    const phase = eased * 4.5 * Math.PI;
    // abs() keeps the face upright as it rolls over; it squashes to an edge at each
    // zero crossing, which is exactly where the numeral swaps to the next face.
    faceScale = Math.abs(Math.cos(phase));
    face = D20_FACES[Math.round(phase / Math.PI) % D20_FACES.length];
    lean = (1 - eased) * 15 * Math.sin(u * Math.PI * 3);
    lift = -Math.abs(Math.sin(eased * Math.PI * 2.5)) * 2.2;
  } else {
    const s = (i - D20_TUMBLE) / (frames - D20_TUMBLE);
    faceScale = 1;
    face = 20;
    lean = Math.max(0, 1 - s * 4) * Math.sin(s * Math.PI * 8) * 4;
    lift = 0;
  }

  const hex = [0, 60, 120, 180, 240, 300].map((a) => at(12, 12, 9.6, a + lean));
  const tri = [270, 30, 150].map((a) => at(12, 12, 7.6, a + lean));
  const facets = [270, 30, 150].flatMap((ta) =>
    [ta - 30, ta + 30].map(
      (ha) => [at(12, 12, 7.6, ta + lean), at(12, 12, 9.6, ha + lean)] as const,
    ),
  );

  return (
    <g transform={`translate(0 ${lift.toFixed(2)})`}>
      <polygon
        points={poly(hex)}
        fill="none"
        stroke={STROKE}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <g
        transform={`translate(12 12) scale(1 ${faceScale.toFixed(3)}) translate(-12 -12)`}
      >
        {facets.map(([v, h], k) => (
          <line
            key={k}
            x1={v[0].toFixed(2)}
            y1={v[1].toFixed(2)}
            x2={h[0].toFixed(2)}
            y2={h[1].toFixed(2)}
            stroke={STROKE}
            strokeWidth={1}
            opacity={0.5}
          />
        ))}
        <polygon
          points={poly(tri)}
          fill="none"
          stroke={STROKE}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
        {faceScale > 0.25 && (
          <text
            x={12}
            y={13.6}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={7.5}
            fontWeight={700}
            fill={STROKE}
            stroke="none"
          >
            {face}
          </text>
        )}
      </g>
    </g>
  );
};

const barsFrame = (i: number, frames: number): ReactElement => {
  const t = i / frames;
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

const gamepadFrame = (i: number, frames: number): ReactElement => {
  const t = i / frames;
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

const coinsFrame = (i: number, frames: number): ReactElement => {
  const t = i / frames;
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

const penFrame = (i: number, frames: number): ReactElement => {
  const p = i / frames;
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

const FRAME_BUILDERS: Record<
  GlyphVariant,
  (i: number, frames: number) => ReactElement
> = {
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
  const frames = VARIANT_FRAMES[variant];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${GLYPH_CELL} ${GLYPH_CELL}`}
      aria-hidden="true"
      focusable="false"
      style={
        {
          "--jz-glyph-duration": speed,
          "--jz-glyph-shift": `-${frames * GLYPH_CELL}px`,
          "--jz-glyph-steps": `steps(${frames})`,
          overflow: "hidden",
        } as CSSProperties
      }
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={GLYPH_CELL} height={GLYPH_CELL} />
        </clipPath>
      </defs>
      <g className="jz-glyph-strip">
        {Array.from({ length: frames }, (_, i) => (
          <g key={i} transform={`translate(${i * GLYPH_CELL} 0)`}>
            {/* Clip per cell so a frame can never bleed into its neighbour. */}
            <g clipPath={`url(#${clipId})`}>{buildFrame(i, frames)}</g>
          </g>
        ))}
      </g>
    </svg>
  );
};

export default AnimatedGlyph;
