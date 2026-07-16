"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { ReadinessRing } from "@/components/ReadinessRing";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { minutesBetween } from "@/lib/sleepEstimate";
import {
  weekKey,
  computeStreak,
  fitnessReachFromDays,
  nutritionReachFromMealsToday,
  sleepReachFromMinutes,
  mindReachFromStreak,
  computeReadiness,
} from "@/lib/domainReach";
import { domainOrderFromProfile, type DomainKey, type UserProfile } from "@/lib/profile";
import { SleepPanel } from "@/components/panels/SleepPanel";
import { NutritionPanel } from "@/components/panels/NutritionPanel";
import { FitnessPanel } from "@/components/panels/FitnessPanel";
import { MindPanel } from "@/components/panels/MindPanel";
import styles from "./page.module.css";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

const PANEL_BY_KEY: Record<DomainKey, React.ComponentType> = {
  sleep: SleepPanel,
  nutrition: NutritionPanel,
  fitness: FitnessPanel,
  mind: MindPanel,
};

export default function DashboardPage() {
  const router = useRouter();
  const [profile, , profileHydrated] = useLocalStorageState<UserProfile | null>("lc_profile_v1", null);
  const [skipped, , skippedHydrated] = useLocalStorageState<boolean>("lc_onboarding_skipped_v1", false);

  const [sleepEntry] = useLocalStorageState<{ bedtime: string; wakeTime: string; quality?: number } | null>(
    "lc_sleep_entry_v1",
    null
  );
  const [meals] = useLocalStorageState<{ date: string }[]>("lc_meals_v1", []);
  const [fitnessDays] = useLocalStorageState<boolean[]>(
    `lc_fitness_${weekKey()}`,
    [false, false, false, false, false, false, false]
  );
  const [mindEntries] = useLocalStorageState<{ date: string }[]>("lc_mind_entries_v1", []);
  const [meditationSessions] = useLocalStorageState<{ date: string }[]>("lc_meditation_sessions_v1", []);

  useEffect(() => {
    if (profileHydrated && skippedHydrated && !profile?.completedAt && !skipped) {
      router.replace("/onboarding");
    }
  }, [profileHydrated, skippedHydrated, profile, skipped, router]);

  const durationReach = sleepEntry ? sleepReachFromMinutes(minutesBetween(sleepEntry.bedtime, sleepEntry.wakeTime)) : 0.04;
  const sleepReach = sleepEntry?.quality ? (durationReach + sleepEntry.quality / 5) / 2 : durationReach;
  const nutritionReach = nutritionReachFromMealsToday(meals.filter((m) => m.date === todayKey()).length);
  const fitnessReach = fitnessReachFromDays(fitnessDays);
  const mindDates = [...mindEntries, ...meditationSessions].map((e) => ({ date: e.date }));
  const mindReach = mindReachFromStreak(computeStreak(mindDates));

  const readiness = computeReadiness({ sleep: sleepReach, nutrition: nutritionReach, fitness: fitnessReach, mind: mindReach });
  const domainOrder = domainOrderFromProfile(profile);

  return (
    <div className={styles.page}>
      <SiteNav active="/dashboard" />

      <div className={styles.header}>
        <span className="eyebrow">Today</span>
        <h1>{profile?.name ? `Where you're at, ${profile.name}` : "Where you're at today"}</h1>
        <p className={styles.headerSub}>
          One readiness score, synthesized from what you&apos;ve actually logged across sleep,
          nutrition, movement, and mind — not a wearable measurement yet, an honest self-reported
          estimate.
        </p>
      </div>

      <div className={styles.overview}>
        <ReadinessRing score={readiness.score} band={readiness.band} />
        <div className={styles.overviewCopy}>
          <div className={styles.overviewLabel}>Readiness, today</div>
          <p className={styles.overviewFocus}>{readiness.focus} is the biggest lever right now.</p>
        </div>
      </div>

      <div className={styles.grid}>
        {domainOrder.map((key) => {
          const Panel = PANEL_BY_KEY[key];
          return <Panel key={key} />;
        })}
      </div>
    </div>
  );
}
