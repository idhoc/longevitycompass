"use client";

import Link from "next/link";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { weekKey, todayIndex } from "@/lib/domainReach";
import styles from "./panels.module.css";

interface WorkoutSession {
  id: string;
  date: string;
  routineId: string;
  title: string;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function FitnessPanel() {
  const key = `lc_fitness_${weekKey()}`;
  const [days, setDays] = useLocalStorageState<boolean[]>(key, [false, false, false, false, false, false, false]);
  const [sessions] = useLocalStorageState<WorkoutSession[]>("lc_workout_sessions_v1", []);

  const completed = days.filter(Boolean).length;
  const idx = todayIndex();
  const lastSession = sessions[sessions.length - 1];

  function toggle(i: number) {
    setDays((d) => d.map((v, j) => (j === i ? !v : v)));
  }

  return (
    <section className={styles.panel} aria-labelledby="fitness-panel-title">
      <div className={styles.panelHead}>
        <div>
          <span className={styles.panelLabel}>Fitness &amp; Movement</span>
          <h3 className={styles.panelTitle} id="fitness-panel-title">
            {completed} of 7 days this week
          </h3>
        </div>
      </div>

      <div className={styles.panelBody}>
        <div role="group" aria-label="Mark days you moved this week" style={{ display: "flex", gap: "0.5em" }}>
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              aria-pressed={days[i]}
              aria-label={`${label}${days[i] ? ", done" : ", not done"}${i === idx ? " (today)" : ""}`}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: i === idx ? "1px solid var(--signal)" : "1px solid var(--line-strong)",
                background: days[i] ? "var(--signal)" : "transparent",
                color: days[i] ? "var(--paper)" : "var(--ink-soft)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p className={styles.emptyText} style={{ margin: 0 }}>
          {lastSession
            ? `Last guided session: ${lastSession.title}.`
            : "Tap a day you moved — walking, lifting, a guided session, anything that counted."}
        </p>
        <div className={styles.panelFooter}>
          <Link href="/fitness" className={`${styles.btn} ${styles.btnPrimary}`}>
            Guided workout
          </Link>
        </div>
      </div>
    </section>
  );
}
