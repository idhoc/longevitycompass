"use client";

import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SleepPanel } from "@/components/panels/SleepPanel";
import { TrendBars } from "@/components/TrendBars";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { getAnyWorkout, estimateMinutes } from "@/lib/workouts";
import { dateKeyOffset, last7Days } from "@/lib/domainReach";
import { computeRecoveryHistory, computeStrain } from "@/lib/whoopScores";
import { JOURNAL_BEHAVIORS, JOURNAL_KEY, computeBehaviorCorrelation, type JournalEntry, type JournalCategory } from "@/lib/journal";
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
  durationMinutes?: number;
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

const CATEGORY_ORDER: JournalCategory[] = ["sleep hygiene", "lifestyle", "nutrition", "mental health", "recovery"];

export default function RecoveryPage() {
  const [sleepEntries] = useLocalStorageState<SleepEntry[]>("lc_sleep_entries_v1", []);
  const [sessions] = useLocalStorageState<WorkoutSession[]>("lc_workout_sessions_v1", []);
  const [journalEntries, setJournalEntries] = useLocalStorageState<JournalEntry[]>(JOURNAL_KEY, []);

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

  const today = todayKey();
  const todaysJournal = journalEntries.find((e) => e.date === today);
  const checked = todaysJournal?.behaviors ?? {};

  function toggle(behaviorId: string) {
    const nextBehaviors = { ...checked, [behaviorId]: !checked[behaviorId] };
    setJournalEntries((prev) => [...prev.filter((e) => e.date !== today), { date: today, behaviors: nextBehaviors }]);
  }

  const correlations = JOURNAL_BEHAVIORS.map((b) => computeBehaviorCorrelation(b.id, journalEntries, recoveryByDate)).filter(
    (c): c is NonNullable<typeof c> => c != null
  );
  const byCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    behaviors: JOURNAL_BEHAVIORS.filter((b) => b.category === cat),
  }));

  return (
    <div className={styles.page}>
      <SiteNav active="/home" />
      <div className={styles.header}>
        <Link href="/home" className={styles.backLink}>← Home</Link>
        <span className="eyebrow" style={{ color: "var(--signal)" }}>Recovery</span>
        <h1>Sleep, vitals, and what actually moves them</h1>
        <p className={styles.headerSub}>
          A real check-in on last night, your resting-HR trend against your own baseline, and a
          nightly behavior log with correlations against next-day Recovery — WHOOP&apos;s Sleep,
          Body, and Journal, together in one place.
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
              <span className={styles.vitalLabel}>Recovery, 7 days</span>
              <TrendBars values={recoveryTrend} color="var(--signal)" />
            </div>
            <div className={styles.vitalCard}>
              <span className={styles.vitalLabel}>Strain, 7 days</span>
              <TrendBars values={strainTrend} color="var(--strain)" />
            </div>
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
              Exactly what WHOOP&apos;s hardware measures continuously. Wiring up a real
              wearable-data API is the honest way to add these — not a simulated number.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <span className={styles.sectionLabel}>Journal</span>
          <p className={styles.vitalNote} style={{ marginBottom: "0.4em" }}>
            A slice of WHOOP&apos;s real 300+ behavior Journal — log what applied today.
          </p>
          {byCategory.map(({ category, behaviors }) => (
            <div className={styles.categoryBlock} key={category}>
              <span className={styles.categoryLabel}>{category}</span>
              <div className={styles.behaviorList}>
                {behaviors.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={checked[b.id] ? `${styles.behaviorRow} ${styles.behaviorRowActive}` : styles.behaviorRow}
                    onClick={() => toggle(b.id)}
                    aria-pressed={!!checked[b.id]}
                  >
                    <span className={styles.checkbox} aria-hidden="true">
                      {checked[b.id] ? "✓" : ""}
                    </span>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className={styles.insightsSection}>
            <span className={styles.categoryLabel}>What&apos;s correlated with your Recovery</span>
            {correlations.length ? (
              <div className={styles.insightList}>
                {correlations.map((c) => {
                  const behavior = JOURNAL_BEHAVIORS.find((b) => b.id === c.behaviorId)!;
                  const diff = c.withAvg - c.withoutAvg;
                  return (
                    <div className={styles.insightCard} key={c.behaviorId}>
                      <p className={styles.insightText}>
                        On nights you logged <strong>{behavior.label.toLowerCase()}</strong>, next-day
                        Recovery averaged <span className="tabular">{c.withAvg}%</span> vs{" "}
                        <span className="tabular">{c.withoutAvg}%</span> otherwise
                        {diff !== 0 && (
                          <>
                            {" "}
                            ({diff > 0 ? "+" : ""}
                            {diff} pts)
                          </>
                        )}
                        .
                      </p>
                      <p className={styles.insightMeta}>
                        {c.withCount} night{c.withCount === 1 ? "" : "s"} with · {c.withoutCount} without
                        — a plain average, not a statistical test.
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className={styles.emptyText}>
                Log at least 3 nights with a behavior on and 3 with it off (and keep logging sleep)
                to see a correlation here — WHOOP itself requires 5 and 5 over 90 days.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
