"use client";

import { useEffect, useState } from "react";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import styles from "./FastingTimer.module.css";

const GOAL_OPTIONS = [12, 14, 16, 18] as const;

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * A real fasting-window tracker, not just a calorie log: the time since
 * your last logged meal, ticking live, against a goal you set — the
 * thing meal-photo logging alone can't show, since it only ever answers
 * "what did you eat," never "how long since you last ate."
 */
export function FastingTimer({ lastMealAt }: { lastMealAt: string | null }) {
  const [goalHours, setGoalHours] = useLocalStorageState<number>("lc_fasting_goal_v1", 14);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!lastMealAt) {
    return (
      <div className={styles.wrap}>
        <p className={styles.emptyText}>Log your first meal to start tracking your fasting window.</p>
      </div>
    );
  }

  const lastMealMs = new Date(lastMealAt).getTime();
  const elapsedMs = now - lastMealMs;
  const goalMs = goalHours * 60 * 60 * 1000;
  const pct = Math.min(100, (elapsedMs / goalMs) * 100);
  const goalMet = elapsedMs >= goalMs;

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>{goalMet ? "Fasting goal reached" : "Since your last meal"}</span>
      <span className={`${styles.clock} tabular`}>{formatDuration(elapsedMs)}</span>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%` }} data-met={goalMet} />
      </div>
      <div className={styles.goalRow}>
        <span className={styles.goalText}>
          {goalMet
            ? `Past your ${goalHours}h goal by ${formatDuration(elapsedMs - goalMs)}`
            : `${formatDuration(goalMs - elapsedMs)} to your ${goalHours}h goal`}
        </span>
        <div className={styles.goalChips}>
          {GOAL_OPTIONS.map((h) => (
            <button
              key={h}
              type="button"
              className={goalHours === h ? `${styles.chip} ${styles.chipActive}` : styles.chip}
              onClick={() => setGoalHours(h)}
              aria-pressed={goalHours === h}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
