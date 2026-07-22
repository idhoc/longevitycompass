"use client";

import styles from "./Gauge.module.css";

interface GaugeProps {
  /** 0–100 */
  value: number;
  size?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  valueText?: string;
  needle?: boolean;
  className?: string;
}

function pointOnArc(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, fromDeg: number, toDeg: number) {
  const start = pointOnArc(cx, cy, r, fromDeg);
  const end = pointOnArc(cx, cy, r, toDeg);
  const sweep = fromDeg - toDeg;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/**
 * The app's signature instrument: a real speedometer-style semicircle
 * gauge, not another fill-up ring. Used large on Home for the aging-pace
 * read and small on each domain tile for that domain's own reach.
 */
export function Gauge({
  value,
  size = 220,
  color = "var(--signal)",
  trackColor = "var(--paper-sunken)",
  label,
  valueText,
  needle = true,
  className,
}: GaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const width = size;
  const height = size * 0.62;
  const cx = width / 2;
  const cy = height - size * 0.08;
  const r = size * 0.4;
  const strokeWidth = size * 0.09;

  const progressAngle = 180 - (clamped / 100) * 180;
  const needleLen = r * 0.72;
  const needleTip = pointOnArc(cx, cy, needleLen, progressAngle);

  return (
    <div className={`${styles.wrap} ${className ?? ""}`} style={{ width }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label ? `${label}: ${valueText ?? clamped}` : undefined}>
        <path
          d={arcPath(cx, cy, r, 180, 0)}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {clamped > 0 && (
          <path
            d={arcPath(cx, cy, r, 180, progressAngle)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ transition: "d 0.6s cubic-bezier(0.16,1,0.3,1)" }}
          />
        )}
        {needle && (
          <>
            <line
              x1={cx}
              y1={cy}
              x2={needleTip.x}
              y2={needleTip.y}
              stroke="var(--ink)"
              strokeWidth={Math.max(2, size * 0.014)}
              strokeLinecap="round"
              style={{ transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)" }}
            />
            <circle cx={cx} cy={cy} r={size * 0.028} fill="var(--ink)" />
          </>
        )}
      </svg>
      {(valueText || label) && (
        <div className={styles.readout} style={{ top: height * 0.78 }}>
          {valueText && (
            <span className={styles.value} style={{ fontSize: size * 0.15 }}>
              {valueText}
            </span>
          )}
          {label && <span className={styles.label}>{label}</span>}
        </div>
      )}
    </div>
  );
}
