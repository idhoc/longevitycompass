"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { ExercisePose } from "@/components/ExercisePose";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { dateKeyOffset, computeStreak } from "@/lib/domainReach";
import {
  WORKOUTS,
  EXERCISE_LIBRARY,
  CATEGORY_LABEL,
  orderWorkoutsForProfile,
  recommendationReason,
  workoutEquipment,
  getAnyWorkout,
  estimateMinutes,
  type WorkoutRoutine,
  type Equipment,
  type ExerciseCategory,
} from "@/lib/workouts";
import { GeneticInsightCard } from "@/components/GeneticInsightCard";
import type { UserProfile } from "@/lib/profile";
import styles from "./page.module.css";

interface WorkoutSession {
  id: string;
  date: string;
  routineId: string;
  title: string;
}

const EQUIPMENT_OPTIONS: { key: Equipment | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "none", label: "No equipment" },
  { key: "dumbbells", label: "Dumbbells" },
  { key: "bands", label: "Bands" },
];

const CATEGORIES: ExerciseCategory[] = ["warmup", "strength", "cardio", "mobility", "cooldown"];

export default function FitnessLibraryPage() {
  const [customWorkouts] = useLocalStorageState<WorkoutRoutine[]>("lc_custom_workouts_v1", []);
  const [profile] = useLocalStorageState<UserProfile | null>("lc_profile_v1", null);
  const [sessions] = useLocalStorageState<WorkoutSession[]>("lc_workout_sessions_v1", []);
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | "all">("all");
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryEquipment, setLibraryEquipment] = useState<Equipment | "all">("all");

  const orderedWorkouts = orderWorkoutsForProfile(WORKOUTS, profile).filter(
    (w) => equipmentFilter === "all" || workoutEquipment(w).includes(equipmentFilter)
  );
  const reason = recommendationReason(profile);

  const completionCount = (routineId: string) => sessions.filter((s) => s.routineId === routineId).length;

  const sessionMinutes = (s: WorkoutSession) => {
    const routine = getAnyWorkout(s.routineId);
    return routine ? estimateMinutes(routine.steps) : 15;
  };
  const last7Keys = new Set(Array.from({ length: 7 }, (_, i) => dateKeyOffset(i)));
  const sessionsThisWeek = sessions.filter((s) => last7Keys.has(s.date));
  const minutesThisWeek = sessionsThisWeek.reduce((sum, s) => sum + sessionMinutes(s), 0);
  const streak = computeStreak(sessions);

  return (
    <div className={styles.page}>
      <SiteNav />

      <div className={styles.header}>
        <Link href="/home" className={styles.backLink}>← Home</Link>
        <span className="eyebrow" style={{ color: "var(--fitness)" }}>Fitness · Movement &amp; Resilience</span>
        <h1>Pick a session</h1>
        <p className={styles.headerSub}>
          Step-by-step, paced by a timer or a tempo cue, with illustrated form instead of video.
          Every exercise explains why it&apos;s there, and finishing one marks today done on your
          weekly tracker.
        </p>
        <Link href="/fitness/build" className={styles.buildCta}>
          Build your own routine →
        </Link>
      </div>

      <div className={styles.statsStrip}>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{sessionsThisWeek.length}</span>
          <span className={styles.statLabel}>Sessions this week</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{minutesThisWeek}</span>
          <span className={styles.statLabel}>Minutes this week</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{streak}</span>
          <span className={styles.statLabel}>Day streak</span>
        </div>
      </div>

      <div style={{ padding: "0 var(--space-6) var(--space-5)" }}>
        <GeneticInsightCard rsids={["rs1815739"]} color="var(--fitness)" />
      </div>

      <div className={styles.filterRow} role="group" aria-label="Filter by equipment">
        {EQUIPMENT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={equipmentFilter === opt.key ? `${styles.tag} ${styles.tagActive}` : styles.tag}
            onClick={() => setEquipmentFilter(opt.key)}
            aria-pressed={equipmentFilter === opt.key}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {customWorkouts.length > 0 && (
        <>
          <div className={styles.sectionLabel}>Your routines</div>
          <div className={styles.grid}>
            {customWorkouts
              .filter((w) => equipmentFilter === "all" || workoutEquipment(w).includes(equipmentFilter))
              .map((w) => (
                <div className={styles.card} key={w.id}>
                  <div className={styles.cardTop}>
                    <span className={styles.cardStyle}>{w.style}</span>
                    <span className={`${styles.cardMinutes} tabular`}>{w.minutes} min</span>
                  </div>
                  <div className={styles.cardTitle}>{w.title}</div>
                  <p className={styles.cardDesc}>{w.description}</p>
                  {completionCount(w.id) > 0 && (
                    <span className={styles.cardProgress}>Completed {completionCount(w.id)}×</span>
                  )}
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
            {completionCount(w.id) > 0 && (
              <span className={styles.cardProgress}>Completed {completionCount(w.id)}×</span>
            )}
            <Link href={`/fitness/${w.id}`} className={styles.cardCta}>
              Start
            </Link>
          </div>
        ))}
      </div>

      <div className={styles.librarySection}>
        <button
          type="button"
          className={styles.libraryToggle}
          onClick={() => setShowLibrary((s) => !s)}
          aria-expanded={showLibrary}
        >
          {showLibrary ? "Hide" : "Browse"} the full exercise library ({EXERCISE_LIBRARY.length} exercises) →
        </button>

        {showLibrary && (
          <>
            <div className={styles.filterRow} role="group" aria-label="Filter exercise library by equipment">
              {EQUIPMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={libraryEquipment === opt.key ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                  onClick={() => setLibraryEquipment(opt.key)}
                  aria-pressed={libraryEquipment === opt.key}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {CATEGORIES.map((cat) => {
              const inCategory = EXERCISE_LIBRARY.filter(
                (e) => e.category === cat && (libraryEquipment === "all" || e.equipment === libraryEquipment)
              );
              if (!inCategory.length) return null;
              return (
                <div key={cat}>
                  <div className={styles.sectionLabel}>{CATEGORY_LABEL[cat]}</div>
                  <div className={styles.exerciseGrid}>
                    {inCategory.map((ex) => (
                      <div key={ex.id} className={styles.exerciseCard}>
                        <ExercisePose pose={ex.pose} size={44} />
                        <span className={styles.exerciseCardName}>{ex.name}</span>
                        <p className={styles.exerciseCardWhy}>{ex.why}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
