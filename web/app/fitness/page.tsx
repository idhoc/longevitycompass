"use client";

import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { WORKOUTS, orderWorkoutsForProfile, recommendationReason, type WorkoutRoutine } from "@/lib/workouts";
import { GeneticInsightCard } from "@/components/GeneticInsightCard";
import type { UserProfile } from "@/lib/profile";
import styles from "./page.module.css";

export default function FitnessLibraryPage() {
  const [customWorkouts] = useLocalStorageState<WorkoutRoutine[]>("lc_custom_workouts_v1", []);
  const [profile] = useLocalStorageState<UserProfile | null>("lc_profile_v1", null);
  const orderedWorkouts = orderWorkoutsForProfile(WORKOUTS, profile);
  const reason = recommendationReason(profile);

  return (
    <div className={styles.page}>
      <SiteNav />

      <div className={styles.header}>
        <Link href="/home" className={styles.backLink}>← Home</Link>
        <span className="eyebrow" style={{ color: "var(--fitness)" }}>Fitness</span>
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

      <div style={{ padding: "0 var(--space-6) var(--space-5)" }}>
        <GeneticInsightCard rsids={["rs1815739"]} color="var(--fitness)" />
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
        {orderedWorkouts.map((w, i) => (
          <div className={styles.card} key={w.id}>
            <div className={styles.cardTop}>
              <span className={styles.cardStyle}>{w.style}</span>
              <span className={`${styles.cardMinutes} tabular`}>{w.minutes} min</span>
            </div>
            <div className={styles.cardTitle}>{w.title}</div>
            {i === 0 && reason && <p className={styles.cardRecommend}>{reason}</p>}
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
