const SEGMENTS = [
  { key: "deep", color: "#0093e7", label: "Deep" },
  { key: "rem", color: "#00f19f", label: "REM" },
  { key: "light", color: "#5a6570", label: "Light" },
  { key: "awake", color: "#ff9a3d", label: "Awake" },
] as const;

export function StageBar({
  deepPct,
  remPct,
  lightPct,
  awakePct,
}: {
  deepPct: number;
  remPct: number;
  lightPct: number;
  awakePct: number;
}) {
  const values: Record<(typeof SEGMENTS)[number]["key"], number> = {
    deep: deepPct,
    rem: remPct,
    light: lightPct,
    awake: awakePct,
  };

  return (
    <div>
      <div
        role="img"
        aria-label={`Sleep stages: ${Math.round(deepPct)}% deep, ${Math.round(remPct)}% REM, ${Math.round(
          lightPct
        )}% light, ${Math.round(awakePct)}% awake`}
        style={{
          display: "flex",
          width: "100%",
          height: 14,
          borderRadius: 999,
          overflow: "hidden",
          border: "1px solid var(--line-strong)",
        }}
      >
        {SEGMENTS.map((seg) => (
          <div
            key={seg.key}
            style={{ width: `${Math.max(0, values[seg.key])}%`, background: seg.color }}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: "1em", marginTop: "0.6em", flexWrap: "wrap" }}>
        {SEGMENTS.map((seg) => (
          <div
            key={seg.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4em",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--ink-soft)",
            }}
          >
            <span
              aria-hidden="true"
              style={{ width: 8, height: 8, borderRadius: "50%", background: seg.color, display: "inline-block" }}
            />
            {seg.label} {Math.round(values[seg.key])}%
          </div>
        ))}
      </div>
    </div>
  );
}
