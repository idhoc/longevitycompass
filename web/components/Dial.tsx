const SIZE = 148;
const STROKE = 11;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface DialProps {
  value: number;
  max: number;
  color: string;
  display: string;
  label: string;
  sublabel?: string;
}

/** A ring dial — the same shape for Sleep, Recovery, and Strain,
 * distinguished only by color and scale, so the three core scores read
 * as one consistent instrument set. */
export function Dial({ value, max, color, display, label, sublabel }: DialProps) {
  const pct = Math.max(0, Math.min(1, value / max));
  const offset = CIRCUMFERENCE * (1 - pct);

  return (
    <div
      role="img"
      aria-label={`${label}: ${display}${sublabel ? `, ${sublabel}` : ""}`}
      style={{ position: "relative", width: SIZE, height: SIZE, flexShrink: 0 }}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--line-strong)" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.9rem", lineHeight: 1, color: "var(--ink)" }}>
          {display}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--ink-soft)",
            marginTop: "0.35em",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
