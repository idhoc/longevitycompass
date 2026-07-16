/**
 * Shared reach (0-1 adherence) calculations, used both inside each domain
 * panel and by the dashboard overview so the headline number is always
 * derived from the same real, stored data — never a separate mock figure.
 */

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
  const band: ReadinessBand = score < 40 ? "low" : score < 70 ? "moderate" : "high";
  const entries = Object.entries(components) as [keyof ReadinessComponents, number][];
  const [weakestKey] = entries.reduce((min, cur) => (cur[1] < min[1] ? cur : min));
  return { score, band, focus: DOMAIN_FOCUS_LABEL[weakestKey] };
}
