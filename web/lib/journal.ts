export type JournalCategory = "sleep hygiene" | "lifestyle" | "nutrition" | "mental health" | "recovery";

export interface JournalBehavior {
  id: string;
  label: string;
  category: JournalCategory;
}

/** A curated slice of WHOOP's real Journal taxonomy (it tracks 300+
 * behaviors across nine categories) — small enough to fill in nightly
 * without it becoming a chore, but drawn from the same real categories:
 * circadian/sleep hygiene, lifestyle, nutrition, mental health, recovery. */
export const JOURNAL_BEHAVIORS: JournalBehavior[] = [
  { id: "alcohol", label: "Had alcohol", category: "lifestyle" },
  { id: "late-caffeine", label: "Caffeine after 2pm", category: "sleep hygiene" },
  { id: "screens-before-bed", label: "Screens in the hour before bed", category: "sleep hygiene" },
  { id: "read-before-bed", label: "Read before bed", category: "sleep hygiene" },
  { id: "consistent-bedtime", label: "Went to bed within an hour of usual time", category: "sleep hygiene" },
  { id: "late-meal", label: "Ate within 2 hours of bedtime", category: "nutrition" },
  { id: "hydrated", label: "Drank enough water today", category: "nutrition" },
  { id: "meditated", label: "Meditated or did breathwork", category: "mental health" },
  { id: "stressful-day", label: "Today felt unusually stressful", category: "mental health" },
  { id: "natural-light", label: "Got outside in daylight", category: "lifestyle" },
  { id: "travel", label: "Traveled or changed time zones", category: "lifestyle" },
  { id: "sick", label: "Feeling sick or run down", category: "recovery" },
  { id: "sore", label: "Muscle soreness from training", category: "recovery" },
  { id: "napped", label: "Took a nap", category: "recovery" },
];

export interface JournalEntry {
  date: string;
  behaviors: Record<string, boolean>;
}

export const JOURNAL_KEY = "lc_journal_v1";

const MIN_SAMPLE = 3;

export interface BehaviorCorrelation {
  behaviorId: string;
  withAvg: number;
  withoutAvg: number;
  withCount: number;
  withoutCount: number;
}

/** Compares next-day Recovery on days a behavior was logged vs. days it
 * wasn't — a plain mean comparison, not a real statistical test. WHOOP
 * requires 5 "yes" and 5 "no" entries in 90 days before it'll show a
 * correlation; this app uses 3 and 3, since a lightweight local journal
 * will rarely accumulate WHOOP's volume, but the comparison itself is
 * exactly as simple both places — an average, nothing more. */
export function computeBehaviorCorrelation(
  behaviorId: string,
  entries: JournalEntry[],
  recoveryByDate: Map<string, number>
): BehaviorCorrelation | null {
  const withScores: number[] = [];
  const withoutScores: number[] = [];

  for (const entry of entries) {
    const nextDay = new Date(entry.date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayKey = nextDay.toISOString().slice(0, 10);
    const recovery = recoveryByDate.get(nextDayKey);
    if (recovery == null) continue;
    if (entry.behaviors[behaviorId]) withScores.push(recovery);
    else withoutScores.push(recovery);
  }

  if (withScores.length < MIN_SAMPLE || withoutScores.length < MIN_SAMPLE) return null;

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  return {
    behaviorId,
    withAvg: Math.round(avg(withScores)),
    withoutAvg: Math.round(avg(withoutScores)),
    withCount: withScores.length,
    withoutCount: withoutScores.length,
  };
}
