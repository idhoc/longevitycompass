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

  // -- Pace of Aging: kept from the prior build, reusing the four-domain
  // reach inputs since it's a longer-run habit trend, not a same-day score --
  const todaysMeals = meals.filter((m) => m.date === todayKey());
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

      <div className={styles.header}>
        <span className="eyebrow">Home</span>
        <h1>{profile?.name ? `Hey, ${profile.name}` : "Home"}</h1>
        <p className={styles.headerSub}>
          Recovery, Sleep, and Strain — read from what you actually logged, not a wearable&apos;s
          heart-rate sensor. {readiness.focus} is the biggest lever right now.
        </p>
      </div>

      <div className={styles.dials}>
        <Link href="/sleep" className={styles.dialLink}>
          <Dial
            value={sleepPerformance}
            max={100}
            color="var(--signal)"
            display={sleepEntry ? `${sleepPerformance}%` : "—"}
            label="Sleep"
          />
        </Link>
        <Link href="/body" className={styles.dialLink}>
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

      <div className={styles.journalCard}>
        <div>
          <div className={styles.journalLabel}>Journal</div>
          <p className={styles.journalText}>
            {journalToday
              ? "Logged for today — check tomorrow's Recovery to see what moved."
              : "Log tonight's behaviors before bed."}
          </p>
        </div>
        <Link href="/journal" className={styles.journalCta}>
          {journalToday ? "Edit" : "Log tonight"}
        </Link>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionTitle}>Activities</span>
          <Link href="/fitness" className={styles.sectionLink}>
            Start one →
          </Link>
        </div>
        {todaysSessions.length ? (
          <div className={styles.activityList}>
            {todaysSessions.map((s) => {
              const routine = getAnyWorkout(s.routineId);
              return (
                <div className={styles.activityRow} key={s.id}>
                  <span className={styles.activityTitle}>{s.title}</span>
                  <span className={`${styles.activityMeta} tabular`}>{routine ? estimateMinutes(routine.steps) : 15} min</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyText}>No activity logged today.</p>
        )}
      </div>

      <div className={styles.grid}>
        <Link href="/nutrition" className={styles.smallCard}>
          <span className={styles.smallLabel}>Nutrition</span>
          <span className={styles.smallStat}>
            {todaysMeals.length ? `${todaysMeals.length} meal${todaysMeals.length === 1 ? "" : "s"}` : "—"}
          </span>
        </Link>
        <Link href="/mind" className={styles.smallCard}>
          <span className={styles.smallLabel}>Mind</span>
          <span className={styles.smallStat}>{mindStreak > 0 ? `${mindStreak}-day streak` : "—"}</span>
        </Link>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionTitle}>Healthspan</span>
        </div>
        {healthspanUnlocked ? (
          <div className={styles.healthspanRow}>
            <AgingPaceGauge pace={agingPace.pace} band={agingPace.band} />
            <p className={styles.emptyText}>
              Pace of Aging — a self-reported habit estimate, not WHOOP&apos;s real nine-metric
              model (sleep, heart-rate zones, strength time, steps, VO2 max, and more). 1.0x is
              average.
            </p>
          </div>
        ) : (
          <p className={styles.emptyText}>
            Log {daysToUnlock} more day{daysToUnlock === 1 ? "" : "s"} of any activity to unlock your
            Pace of Aging — a lighter version of WHOOP&apos;s real 21-recoveries-in-31-days
            requirement.
          </p>
        )}
      </div>
    </div>
  );
}
