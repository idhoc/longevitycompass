/**
 * Real cross-domain insights, built only from what's actually been
 * logged — no synthetic examples, no insight shown until there's enough
 * data behind it. Each generator buckets real entries and reports a
 * plain average comparison, sample sizes included, so nothing here reads
 * as more certain than a handful of self-reported nights actually
 * supports. This is the "breadth becomes intelligence" layer: Sleep,
 * Fitness, and Mind data, read together instead of as four separate
 * static screens.
 */

export interface SleepLogEntry {
  date: string;
  quality: number;
  disruptors?: string[];
  caffeineAfter?: string;
  awakenings?: number;
}

export interface WorkoutLogEntry {
  date: string;
}

export interface MindLogEntry {
  date: string;
}

export interface CrossDomainInsight {
  id: string;
  headline: string;
  detail: string;
  sampleSize: number;
}

const MIN_BUCKET_SIZE = 3;
const MIN_QUALITY_GAP = 0.5; // out of 5 — below this, the difference isn't worth surfacing

function avg(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function timeToMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Late caffeine vs. same-night sleep quality. */
function caffeineInsight(entries: SleepLogEntry[]): CrossDomainInsight | null {
  const late: number[] = [];
  const earlyOrNone: number[] = [];
  for (const e of entries) {
    if (!e.quality) continue;
    const minutes = e.caffeineAfter ? timeToMinutes(e.caffeineAfter) : null;
    if (minutes != null && minutes >= 14 * 60) late.push(e.quality);
    else earlyOrNone.push(e.quality);
  }
  if (late.length < MIN_BUCKET_SIZE || earlyOrNone.length < MIN_BUCKET_SIZE) return null;
  const lateAvg = avg(late);
  const earlyAvg = avg(earlyOrNone);
  const gap = earlyAvg - lateAvg;
  if (gap < MIN_QUALITY_GAP) return null;
  return {
    id: "caffeine-sleep",
    headline: "Late caffeine tracks with worse sleep, in your own log",
    detail: `On the ${late.length} nights you logged caffeine after 2pm, quality averaged ${lateAvg.toFixed(1)}/5 — versus ${earlyAvg.toFixed(1)}/5 on the ${earlyOrNone.length} nights you didn't. Correlation from your own entries, not a clinical claim.`,
    sampleSize: late.length + earlyOrNone.length,
  };
}

/** Same-day workout vs. that night's sleep quality. */
function workoutSleepInsight(entries: SleepLogEntry[], sessions: WorkoutLogEntry[]): CrossDomainInsight | null {
  const workoutDates = new Set(sessions.map((s) => s.date));
  const onWorkoutDay: number[] = [];
  const restDay: number[] = [];
  for (const e of entries) {
    if (!e.quality) continue;
    (workoutDates.has(e.date) ? onWorkoutDay : restDay).push(e.quality);
  }
  if (onWorkoutDay.length < MIN_BUCKET_SIZE || restDay.length < MIN_BUCKET_SIZE) return null;
  const workoutAvg = avg(onWorkoutDay);
  const restAvg = avg(restDay);
  const gap = workoutAvg - restAvg;
  if (Math.abs(gap) < MIN_QUALITY_GAP) return null;
  const better = gap > 0;
  return {
    id: "workout-sleep",
    headline: better
      ? "You sleep better on days you move"
      : "Your sleep runs lower on workout days",
    detail: `Nights following a logged session averaged ${workoutAvg.toFixed(1)}/5 (${onWorkoutDay.length} nights), against ${restAvg.toFixed(1)}/5 on days with no session logged (${restDay.length} nights).${better ? "" : " Could be timing — a hard session close to bedtime raises core temperature and can make it harder to wind down."}`,
    sampleSize: onWorkoutDay.length + restDay.length,
  };
}

/** Which logged disruptor shows up most on genuinely low-quality nights. */
function disruptorInsight(entries: SleepLogEntry[]): CrossDomainInsight | null {
  const lowNights = entries.filter((e) => e.quality > 0 && e.quality <= 2 && e.disruptors?.length);
  if (lowNights.length < MIN_BUCKET_SIZE) return null;
  const counts = new Map<string, number>();
  for (const e of lowNights) {
    for (const tag of e.disruptors ?? []) {
      if (tag === "None") continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  if (counts.size === 0) return null;
  const [topTag, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topCount < MIN_BUCKET_SIZE) return null;
  return {
    id: "disruptor-pattern",
    headline: `${topTag} shows up most on your worst nights`,
    detail: `You flagged "${topTag}" on ${topCount} of the ${lowNights.length} nights you rated 2/5 or lower — the most common disruptor in that group.`,
    sampleSize: lowNights.length,
  };
}

/** A mind check-in (reflect or meditation) logged that day, vs. that
 * night's sleep quality — whether the habit of noticing tracks with
 * calmer nights, in this person's own data. */
function mindSleepInsight(entries: SleepLogEntry[], mindLogs: MindLogEntry[]): CrossDomainInsight | null {
  const mindDates = new Set(mindLogs.map((m) => m.date));
  const withMind: number[] = [];
  const withoutMind: number[] = [];
  for (const e of entries) {
    if (!e.quality) continue;
    (mindDates.has(e.date) ? withMind : withoutMind).push(e.quality);
  }
  if (withMind.length < MIN_BUCKET_SIZE || withoutMind.length < MIN_BUCKET_SIZE) return null;
  const withAvg = avg(withMind);
  const withoutAvg = avg(withoutMind);
  const gap = withAvg - withoutAvg;
  if (gap < MIN_QUALITY_GAP) return null;
  return {
    id: "mind-sleep",
    headline: "Days you check in on Mind, sleep tends to follow",
    detail: `Nights after a reflect or meditation entry averaged ${withAvg.toFixed(1)}/5 (${withMind.length} nights), versus ${withoutAvg.toFixed(1)}/5 on days without one (${withoutMind.length} nights).`,
    sampleSize: withMind.length + withoutMind.length,
  };
}

export function crossDomainInsights(data: {
  sleepEntries: SleepLogEntry[];
  sessions: WorkoutLogEntry[];
  mindLogs: MindLogEntry[];
}): CrossDomainInsight[] {
  return [
    caffeineInsight(data.sleepEntries),
    workoutSleepInsight(data.sleepEntries, data.sessions),
    disruptorInsight(data.sleepEntries),
    mindSleepInsight(data.sleepEntries, data.mindLogs),
  ].filter((i): i is CrossDomainInsight => i != null);
}
