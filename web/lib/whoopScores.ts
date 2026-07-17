import { minutesBetween } from "./sleepEstimate";

/**
 * WHOOP-style scoring, adapted to what this app can honestly measure:
 * self-reported sleep and an optional manual resting-heart-rate entry,
 * not a continuous HRV/PPG sensor. The score shapes (0-100 Recovery with
 * green/yellow/red bands at 67/34, 0-100 Sleep Performance, 0-21 Strain)
 * mirror WHOOP's real scales; the inputs behind them are plainly weaker,
 * and every surface using these must say so.
 */

export type RecoveryBand = "high" | "moderate" | "low";

export function recoveryBand(score: number): RecoveryBand {
  return score >= 67 ? "high" : score >= 34 ? "moderate" : "low";
}

export const RECOVERY_COLOR: Record<RecoveryBand, string> = {
  high: "var(--recovery-high)",
  moderate: "var(--recovery-med)",
  low: "var(--recovery-low)",
};

interface SleepInputs {
  bedtime: string;
  wakeTime: string;
  quality: number; // 1-5
}

const SLEEP_NEED_MINUTES = 8 * 60;

/** Sleep Performance: actual duration against an 8h need, blended with
 * the self-reported quality rating — WHOOP's real version also weighs
 * consistency and disturbances, which we don't independently capture. */
export function computeSleepPerformance(entry: SleepInputs | null): number {
  if (!entry) return 0;
  const minutes = minutesBetween(entry.bedtime, entry.wakeTime);
  const durationScore = Math.min(100, (minutes / SLEEP_NEED_MINUTES) * 100);
  const qualityScore = (entry.quality / 5) * 100;
  return Math.round(durationScore * 0.7 + qualityScore * 0.3);
}

interface RecoveryInputs {
  sleepPerformance: number; // 0-100
  restingHR?: number;
  restingHRBaseline?: number | null;
  stressLevel?: number; // 1-5, higher = more stressed
}

/** Recovery: sleep-led, nudged by how today's resting HR compares to the
 * person's own recent baseline (a real recovery signal — an elevated
 * resting HR against your own norm is one of the clearest signs your
 * body is still working hard) and yesterday's self-reported stress. */
export function computeRecovery({ sleepPerformance, restingHR, restingHRBaseline, stressLevel }: RecoveryInputs): number {
  let score = sleepPerformance;

  if (restingHR != null && restingHRBaseline) {
    const deltaPct = ((restingHR - restingHRBaseline) / restingHRBaseline) * 100;
    // Each 1% above baseline knocks off ~3 points, capped at a 24-point swing.
    score -= Math.max(-24, Math.min(24, deltaPct * 3));
  }

  if (stressLevel != null) {
    score += (3 - stressLevel) * 4; // calmer than mid = bonus, more stressed = penalty
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

/** Strain: WHOOP derives this from time spent in each heart-rate zone
 * (a Borg-scale-based cardiovascular load, 0-21). Without continuous HR
 * we approximate load from logged workout minutes on a saturating
 * curve — more minutes raise it, but with diminishing returns near the
 * top of the scale, same shape as the real metric. */
export function computeStrain(workoutMinutesToday: number): number {
  if (workoutMinutesToday <= 0) return 0;
  const strain = 21 * (1 - Math.exp(-workoutMinutesToday / 45));
  return Math.round(strain * 10) / 10;
}

interface SleepEntryRecord extends SleepInputs {
  date: string;
  restingHeartRate?: string;
}

/** Recovery for every date with a logged sleep entry, using each day's
 * own resting HR against a trailing 7-entry baseline of prior nights —
 * the same "compare against your own recent norm" idea WHOOP uses,
 * just over self-reported nights instead of continuous sensor data.
 * Used to feed the Recovery trend chart. */
export function computeRecoveryHistory(entries: SleepEntryRecord[]): Map<string, number> {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const result = new Map<string, number>();

  sorted.forEach((entry, i) => {
    const sleepPerformance = computeSleepPerformance(entry);
    const priorHRs = sorted
      .slice(Math.max(0, i - 7), i)
      .map((e) => Number(e.restingHeartRate))
      .filter((n) => Number.isFinite(n) && n > 0);
    const baseline = priorHRs.length ? priorHRs.reduce((s, v) => s + v, 0) / priorHRs.length : null;
    const restingHR = Number(entry.restingHeartRate);
    result.set(
      entry.date,
      computeRecovery({
        sleepPerformance,
        restingHR: Number.isFinite(restingHR) && restingHR > 0 ? restingHR : undefined,
        restingHRBaseline: baseline,
      })
    );
  });

  return result;
}

export function strainLabel(strain: number): string {
  if (strain === 0) return "No activity logged";
  if (strain < 8) return "Light";
  if (strain < 14) return "Moderate";
  if (strain < 18) return "Strenuous";
  return "All out";
}
