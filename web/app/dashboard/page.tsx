"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { ReadinessRing } from "@/components/ReadinessRing";
import { AgingPaceGauge } from "@/components/AgingPaceGauge";
import { SummaryCard } from "@/components/panels/SummaryCard";
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
import { computeAgingPace } from "@/lib/agingPace";
import { domainOrderFromProfile, type DomainKey, type UserProfile } from "@/lib/profile";
import styles from "./page.module.css";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

const DOMAIN_HREF: Record<DomainKey, string> = {
  sleep: "/sleep",
  nutrition: "/nutrition",
  fitness: "/fitness",
  mind: "/mind",
};

export default function DashboardPage() {
  const router = useRouter();
  const [profile, , profileHydrated] = useLocalStorageState<UserProfile | null>("lc_profile_v1", null);
  const [skipped, , skippedHydrated] = useLocalStorageState<boolean>("lc_onboarding_skipped_v1", false);

  const [sleepEntry] = useLocalStorageState<{ bedtime: string; wakeTime: string; quality?: number } | null>(
    "lc_sleep_entry_v1",
    null
  );
  const [meals] = useLocalStorageState<{ date: string; totalCalories: number | null }[]>("lc_meals_v1", []);
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

  const SUMMARIES: Record<DomainKey, { label: string; title: string; detail: string }> = {
    sleep: {
      label: "Sleep & Recovery",
      title: sleepEntry ? `${(minutesBetween(sleepEntry.bedtime, sleepEntry.wakeTime) / 60).toFixed(1)}h logged` : "Not logged yet",
      detail: sleepEntry
        ? `Quality ${sleepEntry.quality ?? "—"}/5. See the stage breakdown and ask why you're tired.`
        : "Log last night's sleep to see a stage breakdown and a causal diagnostic.",
    },
    nutrition: {
      label: "Nutrition",
      title: todaysMeals.length ? `${Math.round(totalCalories)} kcal today` : "Nothing logged today",
      detail: todaysMeals.length
        ? `${todaysMeals.length} meal${todaysMeals.length === 1 ? "" : "s"} photographed today.`
        : "Photograph a meal, or what's in your fridge, to get started.",
    },
    fitness: {
      label: "Fitness & Movement",
      title: `${completedDays} of 7 days this week`,
      detail: "Guided sessions with real customization, or build your own routine.",
    },
    mind: {
      label: "Mind & Purpose",
      title: mindStreak > 0 ? `${mindStreak} day streak` : "Not logged yet",
      detail: "Daily reflection, guided meditation, and a mindful break timer.",
    },
  };

  return (
    <div className={styles.page}>
      <SiteNav active="/dashboard" />

      <div className={styles.header}>
        <span className="eyebrow">Today</span>
        <h1>{profile?.name ? `Where you're at, ${profile.name}` : "Where you're at today"}</h1>
        <p className={styles.headerSub}>
          Two instruments reading the same logged data from different angles — today&apos;s
          readiness, and your longer-run pace of aging. Everything else lives on its own page.
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
        {domainOrder.map((key) => (
          <SummaryCard key={key} href={DOMAIN_HREF[key]} {...SUMMARIES[key]} />
        ))}
      </div>
    </div>
  );
}
