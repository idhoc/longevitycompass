const SIZE = 160;
const STROKE = 12;
const GAP = 4;

interface Ring {
  label: string;
  value: number;
  target: number;
  color: string;
}

/** Three concentric progress rings, Apple Health Activity-ring style —
 * protein, carbs, and fat against a daily target, layered instead of
 * three separate bars so "today's food" reads as one shape at a glance. */
export function MacroRings({
  proteinG,
  carbsG,
  fatG,
  proteinTarget,
  carbsTarget,
  fatTarget,
}: {
  proteinG: number;
  carbsG: number;
  fatG: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
}) {
  const rings: Ring[] = [
    { label: "Protein", value: proteinG, target: proteinTarget, color: "var(--nutrition)" },
    { label: "Carbs", value: carbsG, target: carbsTarget, color: "#ffcf5c" },
    { label: "Fat", value: fatG, target: fatTarget, color: "#ff6b5f" },
  ];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1.6em", flexWrap: "wrap" }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        {rings.map((ring, i) => {
          const r = SIZE / 2 - STROKE / 2 - i * (STROKE + GAP);
          const c = 2 * Math.PI * r;
          const pct = Math.max(0, Math.min(1, ring.value / ring.target));
          return (
            <g key={ring.label}>
              <circle cx={SIZE / 2} cy={SIZE / 2} r={r} fill="none" stroke="var(--paper-sunken)" strokeWidth={STROKE} />
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={r}
                fill="none"
                stroke={ring.color}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - pct)}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
            </g>
          );
        })}
      </svg>
      <div
        role="img"
        aria-label={rings.map((r) => `${r.label}: ${Math.round(r.value)} of ${r.target}g`).join(", ")}
        style={{ display: "flex", flexDirection: "column", gap: "0.6em" }}
      >
        {rings.map((ring) => (
          <div key={ring.label} style={{ display: "flex", alignItems: "center", gap: "0.6em" }}>
            <span
              aria-hidden="true"
              style={{ width: 9, height: 9, borderRadius: "50%", background: ring.color, flexShrink: 0 }}
            />
            <span style={{ fontSize: "var(--text-sm)", color: "var(--ink-soft)" }}>{ring.label}</span>
            <span className="tabular" style={{ fontSize: "var(--text-sm)", color: "var(--ink)", marginLeft: "auto" }}>
              {Math.round(ring.value)}
              <span style={{ color: "var(--ink-faint)" }}>/{ring.target}g</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
