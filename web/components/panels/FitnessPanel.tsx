"use client";

import { TrajectoryScene } from "@/components/TrajectoryScene";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { weekKey, todayIndex, fitnessReachFromDays } from "@/lib/domainReach";
import styles from "./panels.module.css";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function FitnessPanel() {
  const key = `lc_fitness_${weekKey()}`;
  const [days, setDays] = useLocalStorageState<boolean[]>(key, [false, false, false, false, false, false, false]);

  const completed = days.filter(Boolean).length;
  const reach = fitnessReachFromDays(days);
  const idx = todayIndex();

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
        <div className={styles.miniScene}>
          <TrajectoryScene reach={reach} interactive={false} radius={0.03} colorStart="#8b8d7e" colorEnd="#3e6b4f" />
        </div>
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
          Tap a day you moved — walking, lifting, a guided session, anything that counted.
        </p>
      </div>
    </section>
  );
}
