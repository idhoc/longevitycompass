"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { Dial } from "@/components/Dial";
import { AgingPaceGauge } from "@/components/AgingPaceGauge";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { minutesBetween } from "@/lib/sleepEstimate";
import { getAnyWorkout, estimateMinutes } from "@/lib/workouts";
import {
  weekKey,
  computeStreak,
  fitnessReachFromDays,
  nutritionReachFromMealsToday,
  sleepReachFromMinutes,
  mindReachFromStreak,
  computeReadiness,
} from "@/lib/domainReach";
import { computeAgingPace } from "@/lib/agingPace";
import {
  computeSleepPerformance,
  computeRecovery,
  computeStrain,
  recoveryBand,
  RECOVERY_COLOR,
} from "@/lib/whoopScores";
import { JOURNAL_KEY, type JournalEntry } from "@/lib/journal";
import type { UserProfile } from "@/lib/profile";
import styles from "./page.module.css";

interface SleepEntry {
  date: string;
  bedtime: string;
  wakeTime: string;
  quality: number;
  restingHeartRate?: string;
}
interface LoggedMeal {
  date: string;
  totalCalories: number | null;
  proteinG: number | null;
}
interface WorkoutSession {
  id: string;
  date: string;
  routineId: string;
  title: string;
}
interface MindEntry {
  date: string;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function greetingWord(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
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
  const [journalEntries] = useLocalStorageState<JournalEntry[]>(JOURNAL_KEY, []);

  useEffect(() => {
    if (profileHydrated && skippedHydrated && !profile?.completedAt && !skipped) {
      router.replace("/onboarding");
    }
  }, [profileHydrated, skippedHydrated, profile, skipped, router]);

  const sleepEntry = sleepEntries.find((e) => e.date === todayKey()) ?? null;
  const sleepPerformance = computeSleepPerformance(sleepEntry);

  const priorHRs = sleepEntries
    .filter((e) => e.date < todayKey())
    .slice(-7)
    .map((e) => Number(e.restingHeartRate))
    .filter((n) => Number.isFinite(n) && n > 0);
  const restingHRBaseline = priorHRs.length ? priorHRs.reduce((s, v) => s + v, 0) / priorHRs.length : null;
  const restingHR = sleepEntry ? Number(sleepEntry.restingHeartRate) : NaN;

  const recovery = computeRecovery({
    sleepPerformance,
    restingHR: Number.isFinite(restingHR) && restingHR > 0 ? restingHR : undefined,
    restingHRBaseline,
  });
  const band = recoveryBand(recovery);

  const todaysSessions = sessions.filter((s) => s.date === todayKey());
  const workoutMinutesToday = todaysSessions.reduce((sum, s) => {
    const routine = getAnyWorkout(s.routineId);
    return sum + (routine ? estimateMinutes(routine.steps) : 15);
  }, 0);
  const strain = computeStrain(workoutMinutesToday);
  const completedDays = fitnessDays.filter(Boolean).length;

  const todaysMeals = meals.filter((m) => m.date === todayKey());
  const totalCalories = todaysMeals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);
  const totalProtein = todaysMeals.reduce((sum, m) => sum + (m.proteinG || 0), 0);

  const durationReach = sleepEntry ? sleepReachFromMinutes(minutesBetween(sleepEntry.bedtime, sleepEntry.wakeTime)) : 0.04;
  const sleepReach = sleepEntry?.quality ? (durationReach + sleepEntry.quality / 5) / 2 : durationReach;
  const nutritionReach = nutritionReachFromMealsToday(todaysMeals.length);
  const fitnessReach = fitnessReachFromDays(fitnessDays);
  const mindDates = [...mindEntries, ...meditationSessions].map((e) => ({ date: e.date }));
  const mindStreak = computeStreak(mindDates);
  const mindReach = mindReachFromStreak(mindStreak);
  const agingPace = computeAgingPace({ sleepReach, fitnessReach, nutritionReach, mindReach });
  const readiness = computeReadiness({ sleep: sleepReach, nutrition: nutritionReach, fitness: fitnessReach, mind: mindReach });

  const loggedDayCount = new Set([
    ...sleepEntries.map((e) => e.date),
    ...meals.map((m) => m.date),
    ...sessions.map((s) => s.date),
    ...mindEntries.map((m) => m.date),
  ]).size;
  const healthspanUnlocked = loggedDayCount >= 5;
  const daysToUnlock = Math.max(0, 5 - loggedDayCount);

  const journalToday = journalEntries.find((e) => e.date === todayKey());

  return (
    <div className={styles.page}>
      <SiteNav active="/home" />

      <div className={styles.hero}>
        <span className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>
        <h1 className={styles.heroTitle}>
          {greetingWord()}{profile?.name ? `, ${profile.name}` : ""}.
        </h1>
        <p className={styles.headerSub}>{readiness.focus} is the biggest lever right now.</p>
      </div>

      <div className={styles.dials}>
        <Link href="/recovery" className={styles.dialLink}>
          <Dial
            value={sleepPerformance}
            max={100}
            color="var(--signal)"
            display={sleepEntry ? `${sleepPerformance}%` : "—"}
            label="Sleep"
          />
        </Link>
        <Link href="/recovery" className={styles.dialLink}>
          <Dial
            value={recovery}
            max={100}
            color={RECOVERY_COLOR[band]}
            display={sleepEntry ? `${recovery}%` : "—"}
            label="Recovery"
          />
        </Link>
        <Link href="/fitness" className={styles.dialLink}>
          <Dial value={strain} max={21} color="var(--strain)" display={strain.toFixed(1)} label="Strain" />
        </Link>
      </div>

      <div className={styles.bento}>
        <Link href="/nutrition" className={`${styles.tile} ${styles.tileNutrition} ${styles.tileWide}`}>
          <span className={styles.tileLabel}>Nutrition</span>
          <span className={styles.tileStat}>{todaysMeals.length ? `${Math.round(totalCalories)} kcal` : "Nothing logged"}</span>
          <p className={styles.tileSub}>
            {todaysMeals.length ? `${todaysMeals.length} meal${todaysMeals.length === 1 ? "" : "s"} · ${Math.round(totalProtein)}g protein` : "Photograph a meal to start"}
          </p>
        </Link>

        <Link href="/fitness" className={`${styles.tile} ${styles.tileFitness} ${styles.tileWide}`}>
          <span className={styles.tileLabel}>Fitness</span>
          <span className={styles.tileStat}>{completedDays}/7 days</span>
          <p className={styles.tileSub}>
            {todaysSessions.length
              ? todaysSessions.map((s) => s.title).join(", ")
              : "No session logged today — start one"}
          </p>
        </Link>

        <Link href="/mind" className={`${styles.tile} ${styles.tileMind}`}>
          <span className={styles.tileLabel}>Mind</span>
          <span className={styles.tileStat}>{mindStreak > 0 ? `${mindStreak}d streak` : "—"}</span>
        </Link>

        <Link href="/recovery" className={`${styles.tile} ${styles.tileJournal}`}>
          <span className={styles.tileLabel}>Journal</span>
          <span className={styles.tileStat}>{journalToday ? "Logged" : "Not yet"}</span>
          <p className={styles.tileSub}>{journalToday ? "Edit tonight's log" : "Log before bed"}</p>
        </Link>

        <div className={`${styles.tile} ${styles.tileHealthspan}`}>
          <span className={styles.tileLabel}>Healthspan</span>
          {healthspanUnlocked ? (
            <div className={styles.healthspanRow}>
              <AgingPaceGauge pace={agingPace.pace} band={agingPace.band} />
              <p className={styles.tileSub}>
                Pace of Aging — a self-reported habit estimate, not WHOOP&apos;s real nine-metric
                model. 1.0x is average.
              </p>
            </div>
          ) : (
            <p className={styles.tileSub}>
              Log {daysToUnlock} more day{daysToUnlock === 1 ? "" : "s"} to unlock your Pace of
              Aging — a lighter version of WHOOP&apos;s real 21-in-31-days requirement.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
