"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./MomentumTrail.module.css";

interface MomentumTrailProps {
  /** Oldest first, most recent last. */
  history: number[];
  hasData: boolean;
}

const WIDTH = 320;
const HEIGHT = 100;
const PAD_X = 16;
const PAD_TOP = 22;
const PAD_BOTTOM = 16;

/**
 * Aging Pace shown as a trail, not a dial or a bar chart: each day is a
 * stone along a path, sitting higher and glowing brighter the more of
 * the four domains actually got logged that day. It's the same
 * direction-over-time idea a sparkline would show, just read as ground
 * covered instead of a graph — and paired with a real explanation of
 * what the number is (and isn't), since a single percentage on its own
 * invites more confidence than a self-reported score deserves.
 */
export function MomentumTrail({ history, hasData }: MomentumTrailProps) {
  const [explained, setExplained] = useState(false);
  const gradientId = useId();

  const today = history[history.length - 1] ?? 0;
  const firstHalf = history.slice(0, Math.floor(history.length / 2));
  const secondHalf = history.slice(Math.floor(history.length / 2));
  const avg = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
  const delta = Math.round(avg(secondHalf) - avg(firstHalf));
  const max = Math.max(...history, 1);

  const n = history.length;
  const usableW = WIDTH - PAD_X * 2;
  const usableH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const points = history.map((v, i) => {
    const x = n > 1 ? PAD_X + (usableW * i) / (n - 1) : PAD_X + usableW / 2;
    const y = PAD_TOP + usableH * (1 - v / max);
    const r = 2.5 + (v / max) * 4.5;
    return { x, y, r, isToday: i === n - 1 };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const todayPoint = points[points.length - 1];

  return (
    <div className={styles.wrap}>
      <div className={styles.headline}>
        <span className={styles.value}>{hasData ? `${Math.round(today)}%` : "—"}</span>
        <span className={styles.label}>Aging Pace, today</span>
      </div>
      {hasData && (
        <p className={styles.delta} data-direction={delta >= 0 ? "up" : "down"}>
          {delta === 0 ? "Steady" : delta > 0 ? `▲ ${delta} vs a week ago` : `▼ ${Math.abs(delta)} vs a week ago`}
        </p>
      )}

      <svg
        className={styles.trail}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Aging pace over the last ${n} days: ${history.map((v) => Math.round(v)).join(", ")}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--ink-faint)" />
            <stop offset="100%" stopColor="var(--signal)" />
          </linearGradient>
        </defs>
        <path d={pathD} className={styles.trailPath} fill="none" stroke={`url(#${gradientId})`} />
        {points.slice(0, -1).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} className={styles.node} />
        ))}
        {todayPoint && (
          <g className={styles.todayGroup} transform={`translate(${todayPoint.x} ${todayPoint.y})`}>
            <circle r={todayPoint.r + 5} className={styles.todayHalo} />
            <circle r={todayPoint.r + 1.5} className={styles.todayNode} />
          </g>
        )}
      </svg>

      <button
        type="button"
        className={styles.explainToggle}
        onClick={() => setExplained((v) => !v)}
        aria-expanded={explained}
      >
        <ChevronDown className={explained ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron} aria-hidden="true" />
        What is Aging Pace?
      </button>
      {explained && (
        <div className={styles.explainer}>
          <p>
            Each stone is one day on the trail, oldest on the left — higher and brighter means
            more of that day&apos;s sleep, food, movement, and mind check-ins actually got logged.
            Today&apos;s stone glows.
          </p>
          <p>
            The percentage is a same-day <strong>behavioral consistency score</strong>, not a
            biological age or a medical measurement — it&apos;s the average of how completely you
            logged all four domains that day. The arrow compares this week&apos;s daily average
            against last week&apos;s, so you can see whether the trail is climbing or dropping,
            not just where it sits right now.
          </p>
        </div>
      )}
    </div>
  );
}
