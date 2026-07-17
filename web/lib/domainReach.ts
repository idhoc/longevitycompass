/**
 * Shared reach (0-1 adherence) calculations, used both inside each domain
 * panel and by the Today overview so the headline number is always
 * derived from the same real, stored data — never a separate mock figure.
 */

import { minutesBetween } from "./sleepEstimate";

export function weekKey(): string {
  const now = new Date();
  const firstDayOfWeek = new Date(now);
  const day = (now.getDay() + 6) % 7; // Monday = 0
  firstDayOfWeek.setDate(now.getDate() - day);
  return firstDayOfWeek.toISOString().slice(0, 10);
}

export function todayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

export function dateKeyOffset(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/** Aligns arbitrary date-keyed entries to the last 7 calendar days (oldest
 * first), filling gaps with null — the shape every trend chart on the
 * Today page needs, so this lives in one place instead of being
 * reimplemented per domain. */
export function last7Days<T extends { date: string }>(entries: T[]): (T | null)[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = dateKeyOffset(6 - i);
    return entries.find((e) => e.date === date) ?? null;
  });
}

export function computeStreak(entries: { date: string }[]): number {
  const byDate = new Set(entries.map((e) => e.date));
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    if (byDate.has(dateKeyOffset(i))) streak++;
    else break;
  }
  return streak;
}

export function fitnessReachFromDays(days: boolean[]): number {
  const completed = days.filter(Boolean).length;
  return Math.max(0.04, completed / 7);
}

export function nutritionReachFromMealsToday(count: number): number {
  return Math.max(0.04, Math.min(1, count / 3));
}

export function sleepReachFromMinutes(minutes: number): number {
  return Math.max(0.04, Math.min(1, minutes / (8 * 60)));
}

export function mindReachFromStreak(streak: number): number {
  return Math.max(0.04, Math.min(1, streak / 7));
}

export interface DomainDayReach {
  date: string;
  sleep: number;
  nutrition: number;
  fitness: number;
  mind: number;
}

/**
 * Per-day, per-domain reach for an arbitrary past date, built only from
 * data that was actually logged that day — 0 means genuinely nothing
 * logged, never a fabricated placeholder. This is what the RoutineCompass
 * renders: a real record of the routine, not a simulated one.
 */
export function dailyDomainReach(
  date: string,
  data: {
    sleepEntries: { date: string; bedtime: string; wakeTime: string; quality?: number }[];
    meals: { date: string }[];
    sessions: { date: string }[];
    mindEntries: { date: string }[];
    meditationSessions: { date: string }[];
  }
): DomainDayReach {
  const sleepEntry = data.sleepEntries.find((e) => e.date === date);
  const sleep = sleepEntry
    ? (() => {
        const duration = sleepReachFromMinutes(minutesBetween(sleepEntry.bedtime, sleepEntry.wakeTime));
        return sleepEntry.quality ? (duration + sleepEntry.quality / 5) / 2 : duration;
      })()
    : 0;

  const mealCount = data.meals.filter((m) => m.date === date).length;
  const nutrition = mealCount > 0 ? nutritionReachFromMealsToday(mealCount) : 0;

  const fitness = data.sessions.some((s) => s.date === date) ? 1 : 0;

  const mind =
    data.mindEntries.some((e) => e.date === date) || data.meditationSessions.some((e) => e.date === date) ? 1 : 0;

  return { date, sleep, nutrition, fitness, mind };
}

export type ReadinessBand = "low" | "moderate" | "high";

export interface ReadinessComponents {
  sleep: number;
  nutrition: number;
  fitness: number;
  mind: number;
}

const DOMAIN_FOCUS_LABEL: Record<keyof ReadinessComponents, string> = {
  sleep: "Last night's sleep",
  nutrition: "Today's nutrition",
  fitness: "This week's movement",
  mind: "Your mind check-in",
};

/**
 * A same-day wellness readiness score, not a physiological recovery
 * metric — there is no HRV or resting-HR input yet (that needs a real
 * wearable-data integration, not something to fake). It synthesizes what
 * you've actually logged across all four domains into one honest number.
 */
export function computeReadiness(components: ReadinessComponents) {
  const score = Math.round(
    ((components.sleep + components.nutrition + components.fitness + components.mind) / 4) * 100
  );
  const band: ReadinessBand = score < 34 ? "low" : score < 67 ? "moderate" : "high";
  const entries = Object.entries(components) as [keyof ReadinessComponents, number][];
  const [weakestKey] = entries.reduce((min, cur) => (cur[1] < min[1] ? cur : min));
  return { score, band, focus: DOMAIN_FOCUS_LABEL[weakestKey] };
}
