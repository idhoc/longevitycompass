"use client";

import { motion } from "framer-motion";
import styles from "./TrendBars.module.css";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function dayLetterForOffset(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return DAY_LETTERS[(d.getDay() + 6) % 7];
}

interface TrendBarsProps {
  /** 7 values, oldest (6 days ago) first, today last, 0-1 normalized. null = no data that day. */
  values: (number | null)[];
  color?: string;
}

export function TrendBars({ values, color = "var(--signal)" }: TrendBarsProps) {
  return (
    <div className={styles.chart} role="img" aria-label="7 day trend, most recent day on the right">
      {values.map((v, i) => {
        const daysAgo = 6 - i;
        return (
          <div key={i} className={styles.col}>
            <div className={styles.track}>
              <motion.div
                className={styles.bar}
                style={{ background: v === null ? "var(--line)" : color }}
                initial={{ height: 0 }}
                animate={{ height: `${v === null ? 4 : Math.max(4, v * 100)}%` }}
                transition={{ duration: 0.5, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <span className={daysAgo === 0 ? `${styles.label} ${styles.labelToday}` : styles.label}>
              {dayLetterForOffset(daysAgo)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
