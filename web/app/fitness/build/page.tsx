"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { ExercisePose } from "@/components/ExercisePose";
import {
  EXERCISE_LIBRARY,
  CATEGORY_LABEL,
  getExercise,
  saveCustomWorkout,
  estimateMinutes,
  type ExerciseCategory,
  type Equipment,
  type RoutineStep,
  type WorkoutRoutine,
} from "@/lib/workouts";
import styles from "./page.module.css";

const CATEGORIES: ExerciseCategory[] = ["warmup", "strength", "cardio", "mobility", "cooldown"];
const EQUIPMENT_OPTIONS: { key: Equipment | "all"; label: string }[] = [
  { key: "all", label: "All equipment" },
  { key: "none", label: "No equipment" },
  { key: "dumbbells", label: "Dumbbells" },
  { key: "bands", label: "Bands" },
];
const INTENSITY_OPTIONS = [
  { value: 0.75, label: "Lighter" },
  { value: 1, label: "Standard" },
  { value: 1.25, label: "Harder" },
  { value: 1.5, label: "Max" },
];

interface BuilderStep {
  key: string;
  exerciseId: string;
  seconds?: number;
  reps?: number;
}

export default function BuildWorkoutPage() {
  const router = useRouter();
  const [steps, setSteps] = useState<BuilderStep[]>([]);
  const [title, setTitle] = useState("");
  const [intensity, setIntensity] = useState(1);
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | "all">("all");

  function addExercise(exerciseId: string) {
    const ex = getExercise(exerciseId);
    if (!ex) return;
    setSteps((prev) => [
      ...prev,
      {
        key: `${exerciseId}-${Date.now()}-${prev.length}`,
        exerciseId,
        seconds: ex.type === "timed" ? ex.defaultSeconds : undefined,
        reps: ex.type === "reps" ? ex.defaultReps : undefined,
      },
    ]);
  }

  function updateStep(key: string, patch: Partial<BuilderStep>) {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function removeStep(key: string) {
    setSteps((prev) => prev.filter((s) => s.key !== key));
  }

  function moveStep(index: number, dir: -1 | 1) {
    setSteps((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleSave() {
    if (!title.trim() || steps.length === 0) return;
    const routineSteps: RoutineStep[] = steps.map((s) => {
      const ex = getExercise(s.exerciseId)!;
      if (ex.type === "timed") {
        const base = s.seconds ?? ex.defaultSeconds ?? 30;
        return { exerciseId: s.exerciseId, seconds: Math.max(5, Math.round(base * intensity)) };
      }
      const base = s.reps ?? ex.defaultReps ?? 10;
      return { exerciseId: s.exerciseId, reps: Math.max(1, Math.round(base * intensity)) };
    });
    const routine: WorkoutRoutine = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      style: "Custom",
      minutes: estimateMinutes(routineSteps),
      description: "A routine you built yourself.",
      steps: routineSteps,
      custom: true,
    };
    saveCustomWorkout(routine);
    router.push(`/fitness/${routine.id}`);
  }

  return (
    <div className={styles.page}>
      <SiteNav />

      <div className={styles.header}>
        <span className="eyebrow">Fitness &amp; Movement</span>
        <h1>Build your own session</h1>
        <p className={styles.headerSub}>
          Pick exercises, set your own reps, durations, and rest, then choose how hard to push it.
          Nothing here is preset.
        </p>
      </div>

      <div className={styles.layout}>
        <div className={styles.library}>
          <div className={styles.tagRow} role="group" aria-label="Filter by equipment">
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

          <button
            type="button"
            className={styles.exerciseRow}
            style={{ width: "100%", cursor: "pointer" }}
            onClick={() => addExercise("rest")}
          >
            <span className={styles.exerciseName}>+ Add a rest period</span>
            <span className={styles.addBtn}>Add</span>
          </button>

          {CATEGORIES.map((cat) => {
            const inCategory = EXERCISE_LIBRARY.filter(
              (e) => e.category === cat && (equipmentFilter === "all" || e.equipment === equipmentFilter)
            );
            if (!inCategory.length) return null;
            return (
              <div key={cat}>
                <span className={styles.categoryLabel}>{CATEGORY_LABEL[cat]}</span>
                {inCategory.map((ex) => (
                  <div key={ex.id} className={styles.exerciseRow}>
                    <ExercisePose pose={ex.pose} size={28} />
                    <span className={styles.exerciseName}>{ex.name}</span>
                    <button type="button" className={styles.addBtn} onClick={() => addExercise(ex.id)}>
                      Add
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className={styles.builder}>
          <span className={styles.builderTitle}>Your routine</span>
          {steps.length === 0 ? (
            <p className={styles.empty}>Add exercises from the left to start building.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5em" }}>
              {steps.map((s, i) => {
                const ex = getExercise(s.exerciseId)!;
                return (
                  <div key={s.key} className={styles.step}>
                    <span className={styles.stepName}>{ex.name}</span>
                    {ex.type === "timed" ? (
                      <>
                        <input
                          type="number"
                          className={styles.stepInput}
                          value={s.seconds ?? ex.defaultSeconds ?? 30}
                          onChange={(e) => updateStep(s.key, { seconds: Number(e.target.value) })}
                          aria-label={`${ex.name} duration in seconds`}
                        />
                        <span className={styles.fieldLabel}>sec</span>
                      </>
                    ) : (
                      <>
                        <input
                          type="number"
                          className={styles.stepInput}
                          value={s.reps ?? ex.defaultReps ?? 10}
                          onChange={(e) => updateStep(s.key, { reps: Number(e.target.value) })}
                          aria-label={`${ex.name} reps`}
                        />
                        <span className={styles.fieldLabel}>reps</span>
                      </>
                    )}
                    <button type="button" className={styles.iconBtn} onClick={() => moveStep(i, -1)} aria-label="Move up">
                      ↑
                    </button>
                    <button type="button" className={styles.iconBtn} onClick={() => moveStep(i, 1)} aria-label="Move down">
                      ↓
                    </button>
                    <button type="button" className={styles.iconBtn} onClick={() => removeStep(s.key)} aria-label={`Remove ${ex.name}`}>
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Intensity</span>
            <div className={styles.tagRow}>
              {INTENSITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={intensity === opt.value ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                  onClick={() => setIntensity(opt.value)}
                  aria-pressed={intensity === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="routine-title">Name this routine</label>
            <input
              id="routine-title"
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Tuesday leg day"
            />
          </div>

          <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={!title.trim() || steps.length === 0}>
            Save &amp; start
          </button>
        </div>
      </div>
    </div>
  );
}
