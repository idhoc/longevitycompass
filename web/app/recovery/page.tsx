"use client";

import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SleepPanel } from "@/components/panels/SleepPanel";
import { TrendBars } from "@/components/TrendBars";
import { Gauge } from "@/components/Gauge";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { getAnyWorkout, estimateMinutes } from "@/lib/workouts";
import { dateKeyOffset, last7Days } from "@/lib/domainReach";
import { computeRecoveryHistory, computeStrain } from "@/lib/recoveryScores";
import { crossDomainInsights } from "@/lib/insights";
import { InsightsPanel } from "@/components/InsightsPanel";
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

type VitalStatus = "in-range" | "watch" | "out-of-range" | "no-data";

const STATUS_LABEL: Record<VitalStatus, string> = {
  "in-range": "Within your typical range",
  watch: "A bit outside your recent norm",
  "out-of-range": "Well outside your recent norm",
  "no-data": "Not enough data yet",
};

const STATUS_COLOR: Record<VitalStatus, string> = {
  "in-range": "var(--recovery-high)",
  watch: "var(--recovery-med)",
  "out-of-range": "var(--recovery-low)",
  "no-data": "var(--ink-faint)",
};

export default function RecoveryPage() {
  const [sleepEntries] = useLocalStorageState<SleepEntry[]>("lc_sleep_entries_v1", []);
  const [sessions] = useLocalStorageState<WorkoutSession[]>("lc_workout_sessions_v1", []);
  const [mindEntries] = useLocalStorageState<MindEntry[]>("lc_mind_entries_v1", []);
  const [meditationSessions] = useLocalStorageState<MindEntry[]>("lc_meditation_sessions_v1", []);

  const insights = crossDomainInsights({
    sleepEntries,
    sessions,
    mindLogs: [...mindEntries, ...meditationSessions],
  });

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
  }

  const rhrTrend = last7Days(sleepEntries).map((e) => {
    if (!e) return null;
    const v = Number(e.restingHeartRate);
    return Number.isFinite(v) && v > 0 ? Math.min(1, v / 100) : null;
  });

  const recoveryByDate = computeRecoveryHistory(sleepEntries);
  const todayRecovery = recoveryByDate.get(todayKey()) ?? null;
  const recoveryTrend = Array.from({ length: 7 }, (_, i) => {
    const date = dateKeyOffset(6 - i);
    const v = recoveryByDate.get(date);
    return v != null ? v / 100 : null;
  });

  const minutesByDate = sessions.reduce<Record<string, number>>((acc, s) => {
    const routine = getAnyWorkout(s.routineId);
    acc[s.date] = (acc[s.date] ?? 0) + (s.durationMinutes ?? (routine ? estimateMinutes(routine.steps) : 15));
    return acc;
  }, {});
  const strainTrend = Array.from({ length: 7 }, (_, i) => {
    const date = dateKeyOffset(6 - i);
    const minutes = minutesByDate[date];
    return minutes ? computeStrain(minutes) / 21 : minutes === 0 ? 0 : null;
  });

  return (
    <div className={styles.page}>
      <SiteNav />
      <div className={styles.header}>
        <Link href="/home" className={styles.backLink}>← Home</Link>
        <span className="eyebrow" style={{ color: "var(--signal)" }}>Recovery · Repair &amp; Restoration</span>
        <h1>Sleep, vitals, and what moves them</h1>
        <p className={styles.headerSub}>
          A real check-in on last night, and your resting heart rate trend against your own
          baseline — sleep and vitals, together in one place.
        </p>
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <span className={styles.sectionLabel}>Check-in</span>
          <SleepPanel />
        </section>

        <section className={styles.section}>
          <span className={styles.sectionLabel}>Vitals</span>
          <div className={styles.vitalCard}>
            <div className={styles.vitalHead}>
              <span className={styles.vitalLabel}>Resting heart rate</span>
              <span className={`${styles.vitalValue} tabular`}>{hasTodayRHR ? `${todayRHR} bpm` : "Not logged"}</span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusDot} style={{ background: STATUS_COLOR[rhrStatus] }} aria-hidden="true" />
              <span className={styles.statusText}>{STATUS_LABEL[rhrStatus]}</span>
            </div>
            <TrendBars values={rhrTrend} color="var(--strain)" />
            <p className={styles.vitalNote}>
              Compared against your own last 7 nights, not a population norm — logged from the
              optional field above.
            </p>
          </div>
          <div className={styles.vitalRow}>
            <div className={styles.vitalCard}>
              <span className={styles.vitalLabel}>Recovery</span>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Gauge
                  size={140}
                  value={todayRecovery ?? 0}
                  valueText={todayRecovery != null ? `${Math.round(todayRecovery)}%` : "—"}
                  needle={false}
                  color="var(--signal)"
                />
              </div>
              <span className={styles.vitalLabel}>Last 7 days</span>
              <TrendBars values={recoveryTrend} color="var(--signal)" />
            </div>
            <div className={styles.vitalCard}>
              <span className={styles.vitalLabel}>Workout load, 7 days</span>
              <TrendBars values={strainTrend} color="var(--strain)" />
            </div>
          </div>
          <p className={styles.vitalNote}>
            Load is estimated from workout duration, not heart-rate zones — a real
            physiological strain number needs a wearable&apos;s continuous heart-rate data.
          </p>
          <div className={styles.unavailableBlock}>
            <span className={styles.categoryLabel}>Not available without a wearable</span>
            <ul className={styles.unavailableList}>
              <li>Heart rate variability (HRV)</li>
              <li>Blood oxygen (SpO2)</li>
              <li>Skin temperature</li>
              <li>Respiratory rate</li>
            </ul>
            <p className={styles.vitalNote}>
              What dedicated wearable hardware measures continuously. Wiring up a real
              wearable-data API is the honest way to add these — not a simulated number.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <span className={styles.sectionLabel}>Insights</span>
          <InsightsPanel insights={insights} loggedNights={sleepEntries.length} />
        </section>
      </div>
    </div>
  );
}
