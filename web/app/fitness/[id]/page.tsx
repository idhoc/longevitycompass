"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getWorkout, getExercise, loadCustomWorkouts, type WorkoutRoutine } from "@/lib/workouts";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { weekKey, todayIndex } from "@/lib/domainReach";
import { computeStrain } from "@/lib/whoopScores";
import styles from "./page.module.css";

const RING_SIZE = 148;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

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

  const pct = seconds > 0 ? remaining / seconds : 0;

  return (
    <>
      <div className={styles.ringWrap} role="timer" aria-live="polite">
        <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} aria-hidden="true">
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="var(--line)"
            strokeWidth={RING_STROKE}
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="var(--fitness)"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - pct)}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            style={{ transition: "stroke-dashoffset 0.9s linear" }}
          />
        </svg>
        <span className={`${styles.timerDisplay} tabular`}>{formatTime(remaining)}</span>
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
  const presetRoutine = getWorkout(params.id);
  const [customRoutine, setCustomRoutine] = useState<WorkoutRoutine | undefined>(undefined);
  const [customChecked, setCustomChecked] = useState(false);

  useEffect(() => {
    if (!presetRoutine) {
      // Custom routines only exist in localStorage, which isn't available
      // during the server render — this has to be read post-mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCustomRoutine(loadCustomWorkouts().find((w) => w.id === params.id));
    }
    setCustomChecked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const routine = presetRoutine ?? customRoutine;

  const [index, setIndex] = useState(0);
  const finishedRef = useRef(false);
  const startRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [, setFitnessDays] = useLocalStorageState<boolean[]>(
    routine ? `lc_fitness_${weekKey()}` : "lc_fitness_unused",
    [false, false, false, false, false, false, false]
  );
  const [, setSessions] = useLocalStorageState<WorkoutSession[]>("lc_workout_sessions_v1", []);

  const steps = routine?.steps ?? [];
  const done = index >= steps.length;
  const rawStep = !done ? steps[index] : null;
  const exercise = rawStep ? getExercise(rawStep.exerciseId) : null;
  const seconds = exercise?.type === "timed" ? rawStep?.seconds ?? exercise.defaultSeconds ?? 30 : null;
  const reps = exercise?.type === "reps" ? rawStep?.reps ?? exercise.defaultReps ?? 10 : null;

  // A live wall-clock tick, independent of any single step's timer — this
  // is what lets the Strain readout climb continuously through both
  // timed and rep-based steps instead of jumping only between them.
  useEffect(() => {
    if (!routine || done) return;
    if (startRef.current === null) startRef.current = Date.now();
    const t = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - (startRef.current as number)) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [routine, done]);

  const liveStrain = computeStrain(elapsedSeconds / 60);

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
    if (!customChecked) return null;
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
          <div className={styles.topRowRight}>
            <span className={`${styles.liveStrain} tabular`}>Strain {liveStrain.toFixed(1)}</span>
            <span className={`${styles.stepCount} tabular`}>
              {index + 1} / {steps.length}
            </span>
          </div>
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
            <Link href="/home" className={`${styles.btn} ${styles.btnPrimary}`}>
              Back to Home
            </Link>
          </div>
        </div>
      ) : (
        <div className={styles.card}>
          <h1 className={styles.stepName}>{exercise!.name}</h1>
          <p className={styles.stepCue}>{exercise!.cue}</p>

          {seconds != null ? (
            <CountdownTimer key={index} seconds={seconds} onComplete={advance} />
          ) : (
            <>
              <div className={styles.repsDisplay}>
                <div className={styles.pulse} aria-hidden="true" />
                <span className={styles.repsNum}>{reps} reps</span>
                {exercise!.tempo && <span className={styles.repsTempo}>{exercise!.tempo}</span>}
              </div>
              <div className={styles.actions}>
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={advance}>
                  Done
                </button>
              </div>
            </>
          )}

          <p className={styles.whyText}>{exercise!.why}</p>

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
