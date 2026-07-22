"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { SiteNav } from "@/components/SiteNav";
import { HabitMomentumGauge } from "@/components/HabitMomentumGauge";
import { TopicIcon, VITAL_ICONS, DOMAIN_ICONS } from "@/lib/icons";
import { RoutineCompass } from "@/components/RoutineCompass";
import { Gauge } from "@/components/Gauge";
import { InsightsPanel } from "@/components/InsightsPanel";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { minutesBetween } from "@/lib/sleepEstimate";
import { getAnyWorkout, estimateMinutes } from "@/lib/workouts";
import {
  weekKey,
  dateKeyOffset,
  dailyDomainReach,
  computeStreak,
  fitnessReachFromDays,
  nutritionReachFromMealsToday,
  sleepReachFromMinutes,
  mindReachFromStreak,
  computeReadiness,
  type DomainDayReach,
} from "@/lib/domainReach";
import { computeHabitMomentum } from "@/lib/habitMomentum";
import {
  computeSleepPerformance,
  computeRecovery,
  computeStrain,
  recoveryBand,
  RECOVERY_COLOR,
} from "@/lib/recoveryScores";
import { domainOrderFromProfile, type UserProfile } from "@/lib/profile";
import { featuredTopics, domainColor } from "@/lib/topics";
import { crossDomainInsights } from "@/lib/insights";
import { t } from "@/lib/i18n";
import { ProductTour, type TourStep } from "@/components/ProductTour";
import styles from "./page.module.css";

interface SleepEntry {
  date: string;
  bedtime: string;
  wakeTime: string;
  quality: number;
  restingHeartRate?: string;
  disruptors?: string[];
  caffeineAfter?: string;
  awakenings?: number;
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
  durationMinutes?: number;
}
interface MindEntry {
  date: string;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

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
  const [tourPending, setTourPending, tourHydrated] = useLocalStorageState<boolean>("lc_tour_pending_v1", false);

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
  const sleepPerformance = computeSleepPerformance(sleepEntry);

  const priorHRs = sleepEntries
    .filter((e) => e.date < todayKey())
    .slice(-7)
    .map((e) => Number(e.restingHeartRate))
    .filter((n) => Number.isFinite(n) && n > 0);
  const restingHRBaseline = priorHRs.length ? priorHRs.reduce((s, v) => s + v, 0) / priorHRs.length : null;
  const restingHR = sleepEntry ? Number(sleepEntry.restingHeartRate) : NaN;
  const hasRestingHR = Number.isFinite(restingHR) && restingHR > 0;

  const recovery = computeRecovery({
    sleepPerformance,
    restingHR: Number.isFinite(restingHR) && restingHR > 0 ? restingHR : undefined,
    restingHRBaseline,
  });
  const band = recoveryBand(recovery);

  const todaysSessions = sessions.filter((s) => s.date === todayKey());
  const workoutMinutesToday = todaysSessions.reduce((sum, s) => {
    const routine = getAnyWorkout(s.routineId);
    return sum + (s.durationMinutes ?? (routine ? estimateMinutes(routine.steps) : 15));
  }, 0);
  const strain = computeStrain(workoutMinutesToday);
  const completedDays = fitnessDays.filter(Boolean).length;

  const todaysMeals = meals.filter((m) => m.date === todayKey());
  const totalCalories = todaysMeals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);
  const totalProtein = todaysMeals.reduce((sum, m) => sum + (m.proteinG || 0), 0);

  const durationReach = sleepEntry ? sleepReachFromMinutes(minutesBetween(sleepEntry.bedtime, sleepEntry.wakeTime)) : 0;
  const sleepReach = sleepEntry?.quality ? (durationReach + sleepEntry.quality / 5) / 2 : durationReach;
  const nutritionReach = nutritionReachFromMealsToday(todaysMeals.length);
  const fitnessReach = fitnessReachFromDays(fitnessDays);
  const mindDates = [...mindEntries, ...meditationSessions].map((e) => ({ date: e.date }));
  const mindStreak = computeStreak(mindDates);
  const mindReach = mindReachFromStreak(mindStreak);
  const habitMomentum = computeHabitMomentum({ sleepReach, fitnessReach, nutritionReach, mindReach });
  const readiness = computeReadiness({ sleep: sleepReach, nutrition: nutritionReach, fitness: fitnessReach, mind: mindReach });
  const hasReadinessData = sleepReach > 0 || nutritionReach > 0 || fitnessReach > 0 || mindReach > 0;

  const loggedDayCount = new Set([
    ...sleepEntries.map((e) => e.date),
    ...meals.map((m) => m.date),
    ...sessions.map((s) => s.date),
    ...mindEntries.map((m) => m.date),
  ]).size;
  const healthspanUnlocked = loggedDayCount >= 5;
  const daysToUnlock = Math.max(0, 5 - loggedDayCount);

  const compassDays: DomainDayReach[] = Array.from({ length: 7 }, (_, i) => {
    const date = dateKeyOffset(6 - i);
    return dailyDomainReach(date, { sleepEntries, meals, sessions, mindEntries, meditationSessions });
  });

  const topInsight = crossDomainInsights({
    sleepEntries,
    sessions,
    mindLogs: [...mindEntries, ...meditationSessions],
  })[0];

  const topics = featuredTopics(domainOrderFromProfile(profile), profile);
  const sleepLogStreak = computeStreak(sleepEntries);

  const tourSteps: TourStep[] = [
    {
      target: "hero",
      title: "Your day at a glance",
      body: "A quick greeting and, once you've logged something in any of the four areas, a note on which one is worth your attention first today.",
    },
    {
      target: "topics",
      title: "Topics",
      body: "Short explainers for anything the app can help with — sleep tracking, guided workouts, meal photos, and more. Tap one to read what it actually does before you use it.",
    },
    {
      target: "vitals",
      title: "Your Compass",
      body: "Each ring is one of the four areas — sleep, nutrition, fitness, mind. Each wedge is a day, with today on top. The four numbers below it are today's real values: sleep duration, resting heart rate, recovery, and training load.",
    },
    ...(topInsight
      ? [
          {
            target: "insight",
            title: "Cross-domain insights",
            body: "When you've logged enough nights and sessions, this surfaces real patterns found in your own data — like a link between late caffeine and worse sleep — not a generic tip.",
          },
        ]
      : []),
    {
      target: "tileRecovery",
      title: "Recovery",
      body: "Log last night's sleep here — bedtime, wake time, quality, what got in the way. That single check-in is what powers the Compass and the vitals above.",
    },
    {
      target: "tileNutrition",
      title: "Nutrition",
      body: "Photograph a meal instead of describing it. You get an editable calorie and macro breakdown you can correct if it's off, plus a running total for today.",
    },
    {
      target: "tileFitness",
      title: "Fitness",
      body: "Guided, timer-paced sessions with a reason given for every exercise, plus a builder if you'd rather make your own routine from the full library.",
    },
    {
      target: "tileMind",
      title: "Mind",
      body: "A short daily reflection, a guided breathing session, or a focus timer — whichever fits the moment. This is also where your reflection streak lives.",
    },
    {
      target: "healthspan",
      title: "Habit Momentum",
      body: "Unlocks after 5 logged days: a consistency trend across all four areas, not a medical or biological-age measurement — just a mirror for your own patterns over time.",
    },
  ];

  function finishTour() {
    setTourPending(false);
  }

  const mindLoggedToday = [...mindEntries, ...meditationSessions].some((e) => e.date === todayKey());
  const nextAction = !sleepEntry
    ? { label: "Log last night's sleep", href: "/recovery", Icon: DOMAIN_ICONS.sleep, color: "var(--signal)" }
    : todaysMeals.length === 0
      ? { label: "Log a meal", href: "/nutrition", Icon: DOMAIN_ICONS.nutrition, color: "var(--nutrition)" }
      : todaysSessions.length === 0
        ? { label: "Start a session", href: "/fitness", Icon: DOMAIN_ICONS.fitness, color: "var(--fitness)" }
        : !mindLoggedToday
          ? { label: "Reflect or breathe", href: "/mind", Icon: DOMAIN_ICONS.mind, color: "var(--mind)" }
          : null;

  return (
    <div className={styles.page}>
      <SiteNav />
      {tourHydrated && tourPending && <ProductTour steps={tourSteps} onDone={finishTour} />}

      <motion.div data-tour="hero" className={styles.hero} initial="hidden" animate="show" variants={fadeUp} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
        <span className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>
        <h1 className={styles.heroTitle}>
          {t(profile?.language, greetingWord())}{profile?.name ? `, ${profile.name}` : ""}.
        </h1>
        <p className={styles.headerSub}>
          {hasReadinessData
            ? `${readiness.focus} is the biggest lever right now.`
            : "Log your first check-in below to see where to focus."}
        </p>
        {nextAction ? (
          <Link href={nextAction.href} className={styles.nextActionBtn} style={{ background: nextAction.color }}>
            <nextAction.Icon className={styles.nextActionIcon} aria-hidden="true" />
            {nextAction.label}
          </Link>
        ) : (
          <p className={styles.nextActionDone}>All four logged today — nice work.</p>
        )}
      </motion.div>

      <motion.div
        data-tour="topics"
        className={styles.topicsSection}
        initial="hidden"
        animate="show"
        variants={fadeUp}
        transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.topicsHead}>
          <h2 className={styles.topicsTitle}>{t(profile?.language, "Topics")}</h2>
          <Link href="/topics" className={styles.topicsLink}>
            {t(profile?.language, "See all")} →
          </Link>
        </div>
        <div className={styles.topicsStrip}>
          {topics.map((topic) => (
            <Link key={topic.id} href={topic.href} className={styles.topicCard} style={{ background: domainColor(topic.domain) }}>
              <TopicIcon name={topic.icon} className={styles.topicIcon} aria-hidden="true" />
              <span className={styles.topicTitle}>{topic.title}</span>
              <p className={styles.topicDesc}>{topic.description}</p>
            </Link>
          ))}
        </div>
      </motion.div>

      <motion.div
        data-tour="vitals"
        className={styles.vitalsCard}
        initial="hidden"
        animate="show"
        variants={fadeUp}
        transition={{ duration: 0.4, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
      >
        <Gauge
          size={260}
          value={hasReadinessData ? readiness.score : 0}
          valueText={hasReadinessData ? `${readiness.score}%` : "—"}
          label={hasReadinessData ? "Aging Pace" : "No data yet"}
          color="var(--signal)"
        />
        <details className={styles.weekDetails}>
          <summary className={styles.weekSummary}>This week, by domain</summary>
          <RoutineCompass
            days={compassDays}
            centerLabel={hasReadinessData ? "Readiness" : "No data yet"}
            centerValue={hasReadinessData ? `${readiness.score}%` : "—"}
          />
        </details>
        <div className={styles.vitalsGrid}>
          <Link href="/recovery" className={styles.vitalCell}>
            <span className={styles.vitalIconBadge} style={{ background: "var(--signal)" }}>
              <VITAL_ICONS.sleep className={styles.vitalIcon} aria-hidden="true" />
            </span>
            <span className={styles.vitalValue}>
              {sleepEntry ? (minutesBetween(sleepEntry.bedtime, sleepEntry.wakeTime) / 60).toFixed(1) : "—"}
              {sleepEntry && <span className={styles.vitalUnit}>h</span>}
            </span>
            <span className={styles.vitalLabel}>Sleep</span>
          </Link>
          <Link href="/recovery" className={styles.vitalCell}>
            <span className={styles.vitalIconBadge} style={{ background: "var(--signal)" }}>
              <VITAL_ICONS.restingHR className={styles.vitalIcon} aria-hidden="true" />
            </span>
            <span className={styles.vitalValue}>
              {hasRestingHR ? restingHR : "—"}
              {hasRestingHR && <span className={styles.vitalUnit}>bpm</span>}
            </span>
            <span className={styles.vitalLabel}>Resting HR</span>
          </Link>
          <Link href="/recovery" className={styles.vitalCell}>
            <span className={styles.vitalIconBadge} style={{ background: RECOVERY_COLOR[band] }}>
              <VITAL_ICONS.recovery className={styles.vitalIcon} aria-hidden="true" />
            </span>
            <span className={styles.vitalValue} style={{ color: RECOVERY_COLOR[band] }}>
              {sleepEntry ? `${recovery}%` : "—"}
            </span>
            <span className={styles.vitalLabel}>Recovery</span>
          </Link>
          <Link href="/fitness" className={styles.vitalCell}>
            <span className={styles.vitalIconBadge} style={{ background: "var(--fitness)" }}>
              <VITAL_ICONS.load className={styles.vitalIcon} aria-hidden="true" />
            </span>
            <span className={styles.vitalValue}>{strain.toFixed(1)}</span>
            <span className={styles.vitalLabel}>Load</span>
          </Link>
        </div>
        {!hasReadinessData && (
          <p className={styles.tileSub}>
            Readiness unavailable — complete your first recovery check-in and log activity to begin.
          </p>
        )}
      </motion.div>

      {topInsight && (
        <motion.div
          data-tour="insight"
          className={styles.insightSection}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <InsightsPanel insights={[topInsight]} loggedNights={sleepEntries.length} />
        </motion.div>
      )}

      <motion.div
        className={styles.grid}
        initial="hidden"
        animate="show"
        variants={fadeUp}
        transition={{ duration: 0.4, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
      >
        <Link href="/recovery" data-tour="tileRecovery" className={`${styles.tile} ${styles.tileRecovery}`}>
          <span className={styles.tileIconBadge}>
            <DOMAIN_ICONS.sleep className={styles.tileIcon} aria-hidden="true" />
          </span>
          <span className={styles.tileLabel}>Recovery</span>
          <span className={styles.tileStat}>{sleepLogStreak > 0 ? `${sleepLogStreak}d streak` : "Not logged yet"}</span>
          <p className={styles.tileSub}>{sleepEntry ? "Last night logged" : "Log last night"}</p>
        </Link>

        <Link href="/nutrition" data-tour="tileNutrition" className={`${styles.tile} ${styles.tileNutrition}`}>
          <span className={styles.tileIconBadge}>
            <DOMAIN_ICONS.nutrition className={styles.tileIcon} aria-hidden="true" />
          </span>
          <span className={styles.tileLabel}>Nutrition</span>
          <span className={styles.tileStat}>{todaysMeals.length ? `${Math.round(totalCalories)} kcal` : "Nothing logged"}</span>
          <p className={styles.tileSub}>
            {todaysMeals.length ? `${todaysMeals.length} meal${todaysMeals.length === 1 ? "" : "s"} · ${Math.round(totalProtein)}g protein` : "Photograph a meal to start"}
          </p>
        </Link>

        <Link href="/fitness" data-tour="tileFitness" className={`${styles.tile} ${styles.tileFitness}`}>
          <span className={styles.tileIconBadge}>
            <DOMAIN_ICONS.fitness className={styles.tileIcon} aria-hidden="true" />
          </span>
          <span className={styles.tileLabel}>Fitness</span>
          <span className={styles.tileStat}>{completedDays}/7 days</span>
          <p className={styles.tileSub}>
            {todaysSessions.length
              ? todaysSessions.map((s) => s.title).join(", ")
              : "No session logged today"}
          </p>
        </Link>

        <Link href="/mind" data-tour="tileMind" className={`${styles.tile} ${styles.tileMind}`}>
          <span className={styles.tileIconBadge}>
            <DOMAIN_ICONS.mind className={styles.tileIcon} aria-hidden="true" />
          </span>
          <span className={styles.tileLabel}>Mind</span>
          <span className={styles.tileStat}>{mindStreak > 0 ? `${mindStreak}d streak` : "Not logged yet"}</span>
          <p className={styles.tileSub}>Reflect, meditate, or take a break</p>
        </Link>
      </motion.div>

      <motion.div
        data-tour="healthspan"
        className={styles.healthspan}
        initial="hidden"
        animate="show"
        variants={fadeUp}
        transition={{ duration: 0.4, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className={styles.tileLabel}>{t(profile?.language, "Healthspan")}</span>
        {healthspanUnlocked ? (
          <div className={styles.healthspanRow}>
            <HabitMomentumGauge momentum={habitMomentum.momentum} band={habitMomentum.band} />
            <p className={styles.tileSub}>
              Habit Momentum — a self-reported consistency trend across the four domains, not a
              lab-validated biological-age model. 1.0x is an average week.
            </p>
          </div>
        ) : (
          <p className={styles.tileSub}>
            Log {daysToUnlock} more day{daysToUnlock === 1 ? "" : "s"}{" "}
            to unlock your Habit Momentum — five logged days is enough for a first read.
          </p>
        )}
      </motion.div>
    </div>
  );
}
