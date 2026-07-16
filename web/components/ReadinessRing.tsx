import type { ReadinessBand } from "@/lib/domainReach";

const SIZE = 176;
const STROKE = 13;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const BAND_COLOR: Record<ReadinessBand, string> = {
  low: "#d97757",
  moderate: "#e0a458",
  high: "#5eead4",
};

const BAND_LABEL: Record<ReadinessBand, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
};

export function ReadinessRing({ score, band }: { score: number; band: ReadinessBand }) {
  const offset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(100, score)) / 100);
  const color = BAND_COLOR[band];

  return (
    <div
      role="img"
      aria-label={`Readiness score ${score} out of 100, ${BAND_LABEL[band]}`}
      style={{ position: "relative", width: SIZE, height: SIZE, flexShrink: 0 }}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--line)" strokeWidth={STROKE} />
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
        <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "2.7rem", lineHeight: 1, color: "var(--ink)" }}>
          {score}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color,
            marginTop: "0.3em",
          }}
        >
          {BAND_LABEL[band]}
        </span>
      </div>
    </div>
  );
}
