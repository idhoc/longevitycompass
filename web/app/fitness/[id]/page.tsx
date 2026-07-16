"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getWorkout } from "@/lib/workouts";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { weekKey, todayIndex } from "@/lib/domainReach";
import styles from "./page.module.css";

interface WorkoutSession {
  id: string;
  date: string;
  routineId: string;
  title: string;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function CountdownTimer({ seconds, onComplete }: { seconds: number; onComplete: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) {
      onComplete();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, running]);

  return (
    <>
      <div className={styles.timerDisplay} role="timer" aria-live="polite">
        {formatTime(remaining)}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={() => setRunning((r) => !r)}>
          {running ? "Pause" : "Resume"}
        </button>
      </div>
    </>
  );
}

export default function WorkoutSessionPage() {
  const params = useParams<{ id: string }>();
  const routine = getWorkout(params.id);

  const [index, setIndex] = useState(0);
  const finishedRef = useRef(false);

  const [, setFitnessDays] = useLocalStorageState<boolean[]>(
    routine ? `lc_fitness_${weekKey()}` : "lc_fitness_unused",
    [false, false, false, false, false, false, false]
  );
  const [, setSessions] = useLocalStorageState<WorkoutSession[]>("lc_workout_sessions_v1", []);

  const steps = routine?.steps ?? [];
  const done = index >= steps.length;
  const step = !done ? steps[index] : null;

  function advance() {
    setIndex((i) => i + 1);
  }

  useEffect(() => {
    if (!routine || !done || finishedRef.current) return;
    finishedRef.current = true;
    setFitnessDays((days) => days.map((v, i) => (i === todayIndex() ? true : v)));
    setSessions((prev) => [...prev, { id: `${Date.now()}`, date: todayKey(), routineId: routine.id, title: routine.title }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (!routine) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.stepName}>Session not found</h1>
          <div className={styles.actions}>
            <Link href="/fitness" className={`${styles.btn} ${styles.btnPrimary}`}>
              Back to sessions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <Link href="/fitness" className={styles.back}>
          ← All sessions
        </Link>
        {!done && (
          <span className={`${styles.stepCount} tabular`}>
            {index + 1} / {steps.length}
          </span>
        )}
      </div>

      {!done && (
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${(index / steps.length) * 100}%` }} />
        </div>
      )}

      {done ? (
        <div className={styles.card}>
          <div className={styles.doneIcon}>✓</div>
          <h1 className={styles.stepName}>{routine.title} complete</h1>
          <p className={styles.doneSub}>Today is marked done on your weekly tracker.</p>
          <div className={styles.actions}>
            <Link href="/fitness" className={styles.btn}>
              Do another
            </Link>
            <Link href="/dashboard" className={`${styles.btn} ${styles.btnPrimary}`}>
              Back to dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className={styles.card}>
          <h1 className={styles.stepName}>{step!.name}</h1>
          <p className={styles.stepCue}>{step!.cue}</p>

          {step!.durationSeconds != null ? (
            <CountdownTimer key={index} seconds={step!.durationSeconds} onComplete={advance} />
          ) : (
            <>
              <div className={styles.repsDisplay}>
                <div className={styles.pulse} aria-hidden="true" />
                <span className={styles.repsNum}>{step!.reps} reps</span>
                {step!.tempo && <span className={styles.repsTempo}>{step!.tempo}</span>}
              </div>
              <div className={styles.actions}>
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={advance}>
                  Done
                </button>
              </div>
            </>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.btn} onClick={advance}>
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
