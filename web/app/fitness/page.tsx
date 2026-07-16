"use client";

import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { WORKOUTS, type WorkoutRoutine } from "@/lib/workouts";
import styles from "./page.module.css";

export default function FitnessLibraryPage() {
  const [customWorkouts] = useLocalStorageState<WorkoutRoutine[]>("lc_custom_workouts_v1", []);

  return (
    <div className={styles.page}>
      <SiteNav active="/fitness" />

      <div className={styles.header}>
        <span className="eyebrow">Guided sessions</span>
        <h1>Pick a session</h1>
        <p className={styles.headerSub}>
          Step-by-step, paced by a timer or a tempo cue — no equipment, no video needed. Every
          exercise explains why it&apos;s there. Finishing one marks today done on your weekly
          tracker.
        </p>
        <Link href="/fitness/build" className={styles.buildCta}>
          Build your own routine →
        </Link>
      </div>

      {customWorkouts.length > 0 && (
        <>
          <div className={styles.sectionLabel}>Your routines</div>
          <div className={styles.grid}>
            {customWorkouts.map((w) => (
              <div className={styles.card} key={w.id}>
                <div className={styles.cardTop}>
                  <span className={styles.cardStyle}>{w.style}</span>
                  <span className={`${styles.cardMinutes} tabular`}>{w.minutes} min</span>
                </div>
                <div className={styles.cardTitle}>{w.title}</div>
                <p className={styles.cardDesc}>{w.description}</p>
                <Link href={`/fitness/${w.id}`} className={styles.cardCta}>
                  Start
                </Link>
              </div>
            ))}
          </div>
        </>
      )}

      <div className={styles.sectionLabel}>Guided sessions</div>
      <div className={styles.grid}>
        {WORKOUTS.map((w) => (
          <div className={styles.card} key={w.id}>
            <div className={styles.cardTop}>
              <span className={styles.cardStyle}>{w.style}</span>
              <span className={`${styles.cardMinutes} tabular`}>{w.minutes} min</span>
            </div>
            <div className={styles.cardTitle}>{w.title}</div>
            <p className={styles.cardDesc}>{w.description}</p>
            <Link href={`/fitness/${w.id}`} className={styles.cardCta}>
              Start
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
