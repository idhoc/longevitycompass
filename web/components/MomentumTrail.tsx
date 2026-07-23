"use client";

import styles from "./MomentumTrail.module.css";

interface MomentumTrailProps {
  /** Oldest first, most recent last. */
  history: number[];
  hasData: boolean;
}

/**
 * Replaces an abstract score-on-a-dial with something a dial can't show:
 * direction. A single percentage doesn't say whether today is better or
 * worse than last week — this does, using the same daily numbers already
 * computed for the week-view compass, just read as a trend instead of a
 * gauge.
 */
export function MomentumTrail({ history, hasData }: MomentumTrailProps) {
  const today = history[history.length - 1] ?? 0;
  const firstHalf = history.slice(0, Math.floor(history.length / 2));
  const secondHalf = history.slice(Math.floor(history.length / 2));
  const avg = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
  const delta = Math.round(avg(secondHalf) - avg(firstHalf));
  const max = Math.max(...history, 1);

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
      <div className={styles.bars} role="img" aria-label={`Aging pace over the last ${history.length} days: ${history.map((v) => Math.round(v)).join(", ")}`}>
        {history.map((v, i) => (
          <div key={i} className={styles.barCol}>
            <div
              className={styles.bar}
              data-today={i === history.length - 1}
              style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
