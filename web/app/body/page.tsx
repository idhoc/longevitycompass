"use client";

import { SiteNav } from "@/components/SiteNav";
import { TrendBars } from "@/components/TrendBars";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { getAnyWorkout, estimateMinutes } from "@/lib/workouts";
import { dateKeyOffset, last7Days } from "@/lib/domainReach";
import { computeRecoveryHistory, computeStrain } from "@/lib/whoopScores";
import styles from "./page.module.css";

interface SleepEntry {
  date: string;
  bedtime: string;
  wakeTime: string;
  quality: number;
  restingHeartRate?: string;
}
interface WorkoutSession {
  id: string;
  date: string;
  routineId: string;
  title: string;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

type VitalStatus = "in-range" | "watch" | "out-of-range" | "no-data";

const STATUS_LABEL: Record<VitalStatus, string> = {
  "in-range": "Within your typical range",
  watch: "A bit outside your recent norm",
  "out-of-range": "Well outside your recent norm",
  "no-data": "Not enough data yet",
};

const STATUS_COLOR: Record<VitalStatus, string> = {
  "in-range": "var(--recovery-high, #16ec06)",
  watch: "var(--recovery-med, #ffde00)",
  "out-of-range": "var(--recovery-low, #ff0026)",
  "no-data": "var(--ink-faint)",
};

export default function BodyPage() {
  const [sleepEntries] = useLocalStorageState<SleepEntry[]>("lc_sleep_entries_v1", []);
  const [sessions] = useLocalStorageState<WorkoutSession[]>("lc_workout_sessions_v1", []);

  const todayEntry = sleepEntries.find((e) => e.date === todayKey());
  const todayRHR = todayEntry ? Number(todayEntry.restingHeartRate) : NaN;
  const hasTodayRHR = Number.isFinite(todayRHR) && todayRHR > 0;

  const priorRHRs = sleepEntries
    .filter((e) => e.date < todayKey())
    .slice(-7)
    .map((e) => Number(e.restingHeartRate))
    .filter((n) => Number.isFinite(n) && n > 0);
  const baseline = priorRHRs.length ? priorRHRs.reduce((s, v) => s + v, 0) / priorRHRs.length : null;

  let rhrStatus: VitalStatus = "no-data";
  if (hasTodayRHR && baseline) {
    const deltaPct = Math.abs((todayRHR - baseline) / baseline) * 100;
    rhrStatus = deltaPct <= 5 ? "in-range" : deltaPct <= 10 ? "watch" : "out-of-range";
  } else if (hasTodayRHR) {
    rhrStatus = "no-data";
  }

  const rhrTrend = last7Days(sleepEntries).map((e) => {
    if (!e) return null;
    const v = Number(e.restingHeartRate);
    return Number.isFinite(v) && v > 0 ? Math.min(1, v / 100) : null;
  });

  const recoveryByDate = computeRecoveryHistory(sleepEntries);
  const recoveryTrend = Array.from({ length: 7 }, (_, i) => {
    const date = dateKeyOffset(6 - i);
    const v = recoveryByDate.get(date);
    return v != null ? v / 100 : null;
  });

  const minutesByDate = sessions.reduce<Record<string, number>>((acc, s) => {
    const routine = getAnyWorkout(s.routineId);
    acc[s.date] = (acc[s.date] ?? 0) + (routine ? estimateMinutes(routine.steps) : 15);
    return acc;
  }, {});
  const strainTrend = Array.from({ length: 7 }, (_, i) => {
    const date = dateKeyOffset(6 - i);
    const minutes = minutesByDate[date];
    return minutes ? computeStrain(minutes) / 21 : minutes === 0 ? 0 : null;
  });

  return (
    <div className={styles.page}>
      <SiteNav active="/body" />

      <div className={styles.header}>
        <span className="eyebrow">Body</span>
        <h1>Health monitor</h1>
        <p className={styles.headerSub}>
          WHOOP&apos;s real Health Monitor reads continuously from wrist sensors: heart rate,
          HRV, blood oxygen, skin temperature, respiratory rate. This app has none of that
          hardware yet — what&apos;s below is built honestly from the one vital you can log by
          hand, plus your Recovery and Strain history.
        </p>
      </div>

      <div className={styles.content}>
        <div className={styles.vitalCard}>
          <div className={styles.vitalHead}>
            <span className={styles.vitalLabel}>Resting heart rate</span>
            <span className={`${styles.vitalValue} tabular`}>
              {hasTodayRHR ? `${todayRHR} bpm` : "Not logged"}
            </span>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusDot} style={{ background: STATUS_COLOR[rhrStatus] }} aria-hidden="true" />
            <span className={styles.statusText}>{STATUS_LABEL[rhrStatus]}</span>
          </div>
          <TrendBars values={rhrTrend} color="var(--strain)" />
          <p className={styles.vitalNote}>
            Compared against your own last 7 nights, not a population norm — logged from the
            optional field in your Sleep check-in.
          </p>
        </div>

        <div className={styles.vitalCard}>
          <div className={styles.vitalHead}>
            <span className={styles.vitalLabel}>Recovery, last 7 days</span>
          </div>
          <TrendBars values={recoveryTrend} color="var(--signal)" />
        </div>

        <div className={styles.vitalCard}>
          <div className={styles.vitalHead}>
            <span className={styles.vitalLabel}>Strain, last 7 days</span>
          </div>
          <TrendBars values={strainTrend} color="var(--strain)" />
        </div>

        <div className={styles.unavailableBlock}>
          <span className={styles.categoryLabel}>Not available without a wearable</span>
          <ul className={styles.unavailableList}>
            <li>Heart rate variability (HRV)</li>
            <li>Blood oxygen (SpO2)</li>
            <li>Skin temperature</li>
            <li>Respiratory rate</li>
          </ul>
          <p className={styles.vitalNote}>
            These are exactly the metrics WHOOP&apos;s hardware measures continuously. Wiring up
            a real wearable-data API is the honest way to add them here — not a simulated number.
          </p>
        </div>
      </div>
    </div>
  );
}
