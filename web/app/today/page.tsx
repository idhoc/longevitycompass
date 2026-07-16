"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { ReadinessRing } from "@/components/ReadinessRing";
import { AgingPaceGauge } from "@/components/AgingPaceGauge";
import { TrendBars } from "@/components/TrendBars";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { minutesBetween } from "@/lib/sleepEstimate";
import { getAnyWorkout, estimateMinutes } from "@/lib/workouts";
import {
  weekKey,
  last7Days,
  dateKeyOffset,
  computeStreak,
  fitnessReachFromDays,
  nutritionReachFromMealsToday,
  sleepReachFromMinutes,
  mindReachFromStreak,
  computeReadiness,
} from "@/lib/domainReach";
import { computeAgingPace } from "@/lib/agingPace";
import { domainOrderFromProfile, type DomainKey, type UserProfile } from "@/lib/profile";
import styles from "./page.module.css";

interface SleepEntry {
  date: string;
  bedtime: string;
  wakeTime: string;
  quality: number;
}
interface LoggedMeal {
  date: string;
  totalCalories: number | null;
}
interface MindEntry {
  date: string;
  purposeRating: number;
}
interface WorkoutSession {
  id: string;
  date: string;
  routineId: string;
  title: string;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

const DOMAIN_HREF: Record<DomainKey, string> = {
  sleep: "/sleep",
  nutrition: "/nutrition",
  fitness: "/fitness",
  mind: "/mind",
};

export default function TodayPage() {
  const router = useRouter();
  const [profile, , profileHydrated] = useLocalStorageState<UserProfile | null>("lc_profile_v1", null);
  const [skipped, , skippedHydrated] = useLocalStorageState<boolean>("lc_onboarding_skipped_v1", false);

  const [sleepEntries] = useLocalStorageState<SleepEntry[]>("lc_sleep_entries_v1", []);
  const [meals] = useLocalStorageState<LoggedMeal[]>("lc_meals_v1", []);
  const [fitnessDays] = useLocalStorageState<boolean[]>(
    `lc_fitness_${weekKey()}`,
    [false, false, false, false, false, false, false]
  );
  const [sessions] = useLocalStorageState<WorkoutSession[]>("lc_workout_sessions_v1", []);
  const [mindEntries] = useLocalStorageState<MindEntry[]>("lc_mind_entries_v1", []);
  const [meditationSessions] = useLocalStorageState<{ date: string }[]>("lc_meditation_sessions_v1", []);

  useEffect(() => {
    if (profileHydrated && skippedHydrated && !profile?.completedAt && !skipped) {
      router.replace("/onboarding");
    }
  }, [profileHydrated, skippedHydrated, profile, skipped, router]);

  const sleepEntry = sleepEntries.find((e) => e.date === todayKey()) ?? null;
  const durationReach = sleepEntry ? sleepReachFromMinutes(minutesBetween(sleepEntry.bedtime, sleepEntry.wakeTime)) : 0.04;
  const sleepReach = sleepEntry?.quality ? (durationReach + sleepEntry.quality / 5) / 2 : durationReach;
  const todaysMeals = meals.filter((m) => m.date === todayKey());
  const nutritionReach = nutritionReachFromMealsToday(todaysMeals.length);
  const fitnessReach = fitnessReachFromDays(fitnessDays);
  const mindDates = [...mindEntries, ...meditationSessions].map((e) => ({ date: e.date }));
  const mindStreak = computeStreak(mindDates);
  const mindReach = mindReachFromStreak(mindStreak);

  const readiness = computeReadiness({ sleep: sleepReach, nutrition: nutritionReach, fitness: fitnessReach, mind: mindReach });
  const agingPace = computeAgingPace({ sleepReach, fitnessReach, nutritionReach, mindReach });
  const domainOrder = domainOrderFromProfile(profile);

  const completedDays = fitnessDays.filter(Boolean).length;
  const totalCalories = todaysMeals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);

  // -- trend series, last 7 calendar days, oldest first --
  const sleepTrend = last7Days(sleepEntries).map((e) =>
    e ? Math.min(1, minutesBetween(e.bedtime, e.wakeTime) / (9 * 60)) : null
  );
  const caloriesByDate = meals.reduce<Record<string, number>>((acc, m) => {
    acc[m.date] = (acc[m.date] ?? 0) + (m.totalCalories || 0);
    return acc;
  }, {});
  const nutritionTrend = Array.from({ length: 7 }, (_, i) => {
    const date = dateKeyOffset(6 - i);
    const kcal = caloriesByDate[date];
    return kcal ? Math.min(1, kcal / 2400) : kcal === 0 ? 0 : null;
  });
  const minutesByDate = sessions.reduce<Record<string, number>>((acc, s) => {
    const routine = getAnyWorkout(s.routineId);
    const minutes = routine ? estimateMinutes(routine.steps) : 15;
    acc[s.date] = (acc[s.date] ?? 0) + minutes;
    return acc;
  }, {});
  const fitnessTrend = Array.from({ length: 7 }, (_, i) => {
    const date = dateKeyOffset(6 - i);
    const minutes = minutesByDate[date];
    return minutes ? Math.min(1, minutes / 30) : minutes === 0 ? 0 : null;
  });
  const mindTrend = last7Days(mindEntries).map((e) => (e ? e.purposeRating / 5 : null));

  const totalTrainingMinutes = Object.values(minutesByDate).reduce((sum, m) => sum + m, 0);

  const MODULES: Record<
    DomainKey,
    { label: string; stat: string; sub: string; trend: (number | null)[] }
  > = {
    sleep: {
      label: "Sleep & Recovery",
      stat: sleepEntry ? `${(minutesBetween(sleepEntry.bedtime, sleepEntry.wakeTime) / 60).toFixed(1)}h` : "—",
      sub: sleepEntry ? `Quality ${sleepEntry.quality}/5 last night` : "Not logged yet",
      trend: sleepTrend,
    },
    nutrition: {
      label: "Nutrition",
      stat: todaysMeals.length ? `${Math.round(totalCalories)} kcal` : "—",
      sub: todaysMeals.length ? `${todaysMeals.length} meal${todaysMeals.length === 1 ? "" : "s"} today` : "Nothing logged today",
      trend: nutritionTrend,
    },
    fitness: {
      label: "Fitness & Movement",
      stat: `${completedDays}/7 days`,
      sub: `${Math.round(totalTrainingMinutes)} min logged this week`,
      trend: fitnessTrend,
    },
    mind: {
      label: "Mind & Purpose",
      stat: mindStreak > 0 ? `${mindStreak}-day streak` : "—",
      sub: "Purpose rating, last 7 days",
      trend: mindTrend,
    },
  };

  return (
    <div className={styles.page}>
      <SiteNav active="/today" />

      <div className={styles.header}>
        <span className="eyebrow">Today</span>
        <h1>{profile?.name ? `Where you're at, ${profile.name}` : "Where you're at today"}</h1>
        <p className={styles.headerSub}>
          Everything below is built from what you&apos;ve actually logged — no simulated
          heart rate, no placeholder chart.
        </p>
      </div>

      <div className={styles.overview}>
        <div className={styles.instrument}>
          <ReadinessRing score={readiness.score} band={readiness.band} />
          <div className={styles.instrumentCopy}>
            <div className={styles.overviewLabel}>Readiness, today</div>
            <p className={styles.overviewFocus}>{readiness.focus} is the biggest lever right now.</p>
          </div>
        </div>
        <div className={styles.instrumentDivider} aria-hidden="true" />
        <div className={styles.instrument}>
          <AgingPaceGauge pace={agingPace.pace} band={agingPace.band} />
          <div className={styles.instrumentCopy}>
            <div className={styles.overviewLabel}>Estimated pace of aging</div>
            <p className={styles.overviewFocus}>
              A self-reported habit estimate, not a blood or wearable biomarker test — 1.0x is
              average.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {domainOrder.map((key) => {
          const m = MODULES[key];
          return (
            <Link key={key} href={DOMAIN_HREF[key]} className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.cardLabel}>{m.label}</span>
                <span className={`${styles.cardStat} tabular`}>{m.stat}</span>
              </div>
              <p className={styles.cardSub}>{m.sub}</p>
              <TrendBars values={m.trend} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
