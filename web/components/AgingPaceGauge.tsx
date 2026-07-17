import type { AgingPaceBand } from "@/lib/agingPace";

const CX = 90;
const CY = 84;
const RADIUS = 68;
const STROKE = 12;

function polar(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + RADIUS * Math.cos(rad), y: CY - RADIUS * Math.sin(rad) };
}

function arcPath(fromDeg: number, toDeg: number) {
  const p1 = polar(fromDeg);
  const p2 = polar(toDeg);
  return `M ${p1.x} ${p1.y} A ${RADIUS} ${RADIUS} 0 0 1 ${p2.x} ${p2.y}`;
}

const SEGMENTS = [
  { from: 180, to: 120, color: "#5fae71" },
  { from: 120, to: 60, color: "#e0a83e" },
  { from: 60, to: 0, color: "#d0625a" },
];

const BAND_LABEL: Record<AgingPaceBand, string> = {
  slower: "Slower",
  typical: "Typical",
  faster: "Faster",
};

export function AgingPaceGauge({ pace, band }: { pace: number; band: AgingPaceBand }) {
  const t = Math.max(0, Math.min(1, (pace - 0.7) / 0.6));
  const needleAngleDeg = 180 - t * 180;
  const needleRad = (needleAngleDeg * Math.PI) / 180;
  const needleLen = RADIUS - 20;
  const nx = CX + needleLen * Math.cos(needleRad);
  const ny = CY - needleLen * Math.sin(needleRad);

  return (
    <div
      role="img"
      aria-label={`Estimated pace of aging: ${pace.toFixed(2)}x, ${BAND_LABEL[band].toLowerCase()} than average`}
      style={{ width: 180, height: 140, position: "relative", flexShrink: 0 }}
    >
      <svg width={180} height={100} viewBox="0 0 180 100" aria-hidden="true">
        {SEGMENTS.map((seg) => (
          <path
            key={seg.color}
            d={arcPath(seg.from, seg.to)}
            stroke={seg.color}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            opacity={0.85}
          />
        ))}
        <line x1={CX} y1={CY} x2={nx} y2={ny} stroke="var(--ink)" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={5} fill="var(--ink)" />
      </svg>
      <div style={{ position: "absolute", top: 100, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.5rem", color: "var(--ink)" }}>
          {pace.toFixed(2)}x
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--ink-soft)",
          }}
        >
          {BAND_LABEL[band]} pace
        </div>
      </div>
    </div>
  );
}
