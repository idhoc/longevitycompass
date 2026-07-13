"use client";

import { SiteNav } from "@/components/SiteNav";
import { TrajectoryScene } from "@/components/TrajectoryScene";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { minutesBetween } from "@/lib/sleepEstimate";
import {
  weekKey,
  computeStreak,
  fitnessReachFromDays,
  nutritionReachFromMealsToday,
  sleepReachFromMinutes,
  mindReachFromStreak,
} from "@/lib/domainReach";
import { SleepPanel } from "@/components/panels/SleepPanel";
import { NutritionPanel } from "@/components/panels/NutritionPanel";
import { FitnessPanel } from "@/components/panels/FitnessPanel";
import { MindPanel } from "@/components/panels/MindPanel";
import styles from "./page.module.css";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [sleepEntry] = useLocalStorageState<{ bedtime: string; wakeTime: string } | null>(
    "lc_sleep_entry_v1",
    null
  );
  const [meals] = useLocalStorageState<{ date: string }[]>("lc_meals_v1", []);
  const [fitnessDays] = useLocalStorageState<boolean[]>(
    `lc_fitness_${weekKey()}`,
    [false, false, false, false, false, false, false]
  );
  const [mindEntries] = useLocalStorageState<{ date: string }[]>("lc_mind_entries_v1", []);

  const sleepReach = sleepEntry ? sleepReachFromMinutes(minutesBetween(sleepEntry.bedtime, sleepEntry.wakeTime)) : 0.04;
  const nutritionReach = nutritionReachFromMealsToday(meals.filter((m) => m.date === todayKey()).length);
  const fitnessReach = fitnessReachFromDays(fitnessDays);
  const mindReach = mindReachFromStreak(computeStreak(mindEntries));

  const overall = Math.round(((sleepReach + nutritionReach + fitnessReach + mindReach) / 4) * 100);

  return (
    <div className={styles.page}>
      <SiteNav active="/dashboard" />

      <div className={styles.header}>
        <span className="eyebrow">Today</span>
        <h1>Where the curve is bending</h1>
        <p className={styles.headerSub}>
          Four domains, each measured its own way — the trajectory below is drawn from
          what you&apos;ve actually logged, not a projection.
        </p>
      </div>

      <div className={styles.overview}>
        <div className={styles.overviewStat}>
          <div className={styles.overviewNum}>{overall}%</div>
          <div className={styles.overviewLabel}>Overall trajectory, today</div>
        </div>
        <div className={styles.overviewScene}>
          <TrajectoryScene
            reach={overall / 100}
            interactive={false}
            radius={0.045}
            colorStart="#8b8d7e"
            colorEnd="#3e6b4f"
          />
        </div>
      </div>

      <div className={styles.grid}>
        <SleepPanel />
        <NutritionPanel />
        <FitnessPanel />
        <MindPanel />
      </div>
    </div>
  );
}
