/**
 * Client-side-only parser for the iPhone Health app's "Export All Health
 * Data" export.xml. The file is read and parsed entirely in the browser
 * via chunked File.slice() reads — it is never uploaded anywhere, and
 * nothing here makes a network request. Only three record types are
 * extracted (resting heart rate, sleep analysis, workouts) because those
 * are the three things this app already has a real place to put.
 */

export interface ParsedRestingHR {
  date: string;
  bpm: number;
}

export interface ParsedSleepNight {
  date: string; // the wake date
  bedtime: string; // HH:MM
  wakeTime: string; // HH:MM
  minutesAsleep: number;
}

export interface ParsedWorkout {
  date: string;
  type: string;
  minutes: number;
}

export interface AppleHealthImportResult {
  restingHeartRates: ParsedRestingHR[];
  sleepNights: ParsedSleepNight[];
  workouts: ParsedWorkout[];
  recordsScanned: number;
}

const CHUNK_BYTES = 4 * 1024 * 1024;

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
}

/** Apple's export dates look like "2026-07-16 08:03:00 -0700". */
function parseAppleDate(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw.replace(" ", "T").replace(/(-\d{2}):?(\d{2})$/, "$1:$2"));
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function hm(d: Date): string {
  return d.toTimeString().slice(0, 5);
}

function friendlyWorkoutType(hkType: string): string {
  return hkType
    .replace("HKWorkoutActivityType", "")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
}

export async function parseAppleHealthExport(
  file: File,
  onProgress?: (pct: number) => void
): Promise<AppleHealthImportResult> {
  const rhrByDate = new Map<string, number[]>();
  const sleepRecords: { start: Date; end: Date; value: string }[] = [];
  const workoutsRaw: { start: Date; type: string; minutes: number }[] = [];
  let recordsScanned = 0;
  let carry = "";
  let offset = 0;

  while (offset < file.size) {
    const slice = file.slice(offset, offset + CHUNK_BYTES);
    const text = await slice.text();
    offset += CHUNK_BYTES;
    const combined = carry + text;
    const cutoff = combined.lastIndexOf("/>");
    const processable = cutoff === -1 ? "" : combined.slice(0, cutoff + 2);
    carry = cutoff === -1 ? combined : combined.slice(cutoff + 2);

    const tagMatches = processable.match(/<(Record|Workout)\b[^>]*\/>/g) ?? [];
    for (const tag of tagMatches) {
      recordsScanned++;
      if (tag.startsWith("<Record")) {
        const type = attr(tag, "type");
        if (type === "HKQuantityTypeIdentifierRestingHeartRate") {
          const start = parseAppleDate(attr(tag, "startDate"));
          const value = Number(attr(tag, "value"));
          if (start && Number.isFinite(value) && value > 0) {
            const key = dateKey(start);
            const arr = rhrByDate.get(key) ?? [];
            arr.push(value);
            rhrByDate.set(key, arr);
          }
        } else if (type === "HKCategoryTypeIdentifierSleepAnalysis") {
          const start = parseAppleDate(attr(tag, "startDate"));
          const end = parseAppleDate(attr(tag, "endDate"));
          const value = attr(tag, "value") ?? "";
          if (start && end) sleepRecords.push({ start, end, value });
        }
      } else if (tag.startsWith("<Workout")) {
        const start = parseAppleDate(attr(tag, "startDate"));
        const type = attr(tag, "workoutActivityType");
        const durationRaw = Number(attr(tag, "duration"));
        const durationUnit = attr(tag, "durationUnit") ?? "min";
        if (start && type && Number.isFinite(durationRaw) && durationRaw > 0) {
          const minutes = durationUnit === "sec" ? durationRaw / 60 : durationRaw;
          workoutsRaw.push({ start, type: friendlyWorkoutType(type), minutes: Math.round(minutes) });
        }
      }
    }
    onProgress?.(Math.min(100, Math.round((offset / file.size) * 100)));
    // Yield to the event loop between chunks so a large file doesn't freeze the tab.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const restingHeartRates: ParsedRestingHR[] = Array.from(rhrByDate.entries()).map(([date, values]) => ({
    date,
    bpm: Math.round(values.reduce((s, v) => s + v, 0) / values.length),
  }));

  const nightsByDate = new Map<string, { start: Date; end: Date; value: string }[]>();
  for (const rec of sleepRecords) {
    const key = dateKey(rec.end);
    const list = nightsByDate.get(key) ?? [];
    list.push(rec);
    nightsByDate.set(key, list);
  }
  const sleepNights: ParsedSleepNight[] = Array.from(nightsByDate.entries()).map(([date, recs]) => {
    const asleepOnly = recs.filter((r) => r.value.includes("Asleep"));
    const relevant = asleepOnly.length ? asleepOnly : recs;
    const minutesAsleep = Math.round(
      relevant.reduce((sum, r) => sum + (r.end.getTime() - r.start.getTime()) / 60000, 0)
    );
    const earliestStart = recs.reduce((min, r) => (r.start < min ? r.start : min), recs[0].start);
    const latestEnd = recs.reduce((max, r) => (r.end > max ? r.end : max), recs[0].end);
    return { date, bedtime: hm(earliestStart), wakeTime: hm(latestEnd), minutesAsleep };
  });

  const workoutsByDate = new Map<string, ParsedWorkout[]>();
  for (const w of workoutsRaw) {
    const key = dateKey(w.start);
    const list = workoutsByDate.get(key) ?? [];
    list.push({ date: key, type: w.type, minutes: w.minutes });
    workoutsByDate.set(key, list);
  }
  const workouts = Array.from(workoutsByDate.values()).flat();

  return { restingHeartRates, sleepNights, workouts, recordsScanned };
}

interface StoredSleepEntry {
  date: string;
  bedtime: string;
  wakeTime: string;
  quality: number;
  awakenings: number;
  disruptors: string[];
  caffeineAfter: string;
  energyToday: "low" | "moderate" | "high";
  restingHeartRate: string;
}

interface StoredWorkoutSession {
  id: string;
  date: string;
  routineId: string;
  title: string;
  durationMinutes?: number;
}

export const APPLE_HEALTH_WORKOUT_ROUTINE_ID = "apple-health-import";

/**
 * Merges a parsed export into the app's real, existing storage keys —
 * filling in nights/workouts you haven't already logged by hand, and
 * never overwriting a manual entry for a date you've already filled in
 * yourself. Runs entirely against localStorage; the caller is expected to
 * reload afterward so every hook re-hydrates from the merged data.
 */
export function mergeAppleHealthImport(result: AppleHealthImportResult): { sleepAdded: number; workoutsAdded: number } {
  const sleepRaw = window.localStorage.getItem("lc_sleep_entries_v1");
  const existingSleep: StoredSleepEntry[] = sleepRaw ? JSON.parse(sleepRaw) : [];
  const existingSleepDates = new Set(existingSleep.map((e) => e.date));

  const rhrByDate = new Map(result.restingHeartRates.map((r) => [r.date, r.bpm]));
  let sleepAdded = 0;
  const newSleep: StoredSleepEntry[] = result.sleepNights
    .filter((n) => !existingSleepDates.has(n.date))
    .map((n) => {
      sleepAdded++;
      const rhr = rhrByDate.get(n.date);
      return {
        date: n.date,
        bedtime: n.bedtime,
        wakeTime: n.wakeTime,
        quality: 3,
        awakenings: 0,
        disruptors: [],
        caffeineAfter: "",
        energyToday: "moderate" as const,
        restingHeartRate: rhr != null ? String(rhr) : "",
      };
    });

  // For nights that were already logged by hand, still backfill a missing
  // resting-HR field from the watch data — never overwrite one you entered.
  const backfilled = existingSleep.map((e) => {
    if (e.restingHeartRate) return e;
    const rhr = rhrByDate.get(e.date);
    return rhr != null ? { ...e, restingHeartRate: String(rhr) } : e;
  });

  window.localStorage.setItem("lc_sleep_entries_v1", JSON.stringify([...backfilled, ...newSleep]));

  const workoutRaw = window.localStorage.getItem("lc_workout_sessions_v1");
  const existingWorkouts: StoredWorkoutSession[] = workoutRaw ? JSON.parse(workoutRaw) : [];
  const existingWorkoutDates = new Set(
    existingWorkouts.filter((w) => w.routineId === APPLE_HEALTH_WORKOUT_ROUTINE_ID).map((w) => w.date + w.title)
  );
  let workoutsAdded = 0;
  const newWorkouts: StoredWorkoutSession[] = result.workouts
    .filter((w) => !existingWorkoutDates.has(w.date + `${w.type} (Apple Health)`))
    .map((w) => {
      workoutsAdded++;
      return {
        id: `applehealth-${w.date}-${w.type}-${Math.random().toString(36).slice(2, 8)}`,
        date: w.date,
        routineId: APPLE_HEALTH_WORKOUT_ROUTINE_ID,
        title: `${w.type} (Apple Health)`,
        durationMinutes: w.minutes,
      };
    });
  window.localStorage.setItem("lc_workout_sessions_v1", JSON.stringify([...existingWorkouts, ...newWorkouts]));

  return { sleepAdded, workoutsAdded };
}
