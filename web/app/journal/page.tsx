"use client";

import { SiteNav } from "@/components/SiteNav";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { JOURNAL_BEHAVIORS, JOURNAL_KEY, computeBehaviorCorrelation, type JournalEntry, type JournalCategory } from "@/lib/journal";
import { computeRecoveryHistory } from "@/lib/whoopScores";
import styles from "./page.module.css";

interface SleepEntryRecord {
  date: string;
  bedtime: string;
  wakeTime: string;
  quality: number;
  restingHeartRate?: string;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

const CATEGORY_ORDER: JournalCategory[] = ["sleep hygiene", "lifestyle", "nutrition", "mental health", "recovery"];

export default function JournalPage() {
  const [entries, setEntries] = useLocalStorageState<JournalEntry[]>(JOURNAL_KEY, []);
  const [sleepEntries] = useLocalStorageState<SleepEntryRecord[]>("lc_sleep_entries_v1", []);

  const today = todayKey();
  const todaysEntry = entries.find((e) => e.date === today);
  const checked = todaysEntry?.behaviors ?? {};

  function toggle(behaviorId: string) {
    const nextBehaviors = { ...checked, [behaviorId]: !checked[behaviorId] };
    setEntries((prev) => [...prev.filter((e) => e.date !== today), { date: today, behaviors: nextBehaviors }]);
  }

  const recoveryByDate = computeRecoveryHistory(sleepEntries);
  const correlations = JOURNAL_BEHAVIORS.map((b) => computeBehaviorCorrelation(b.id, entries, recoveryByDate)).filter(
    (c): c is NonNullable<typeof c> => c != null
  );

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    behaviors: JOURNAL_BEHAVIORS.filter((b) => b.category === cat),
  }));

  return (
    <div className={styles.page}>
      <SiteNav active="/journal" />

      <div className={styles.header}>
        <span className="eyebrow">Journal</span>
        <h1>Tonight&apos;s behaviors</h1>
        <p className={styles.headerSub}>
          A small slice of WHOOP&apos;s real 300+ behavior Journal — log what applied today, and
          once you&apos;ve got enough nights logged, see what actually moves your next-day
          Recovery.
        </p>
      </div>

      <div className={styles.content}>
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
                      On nights you logged <strong>{behavior.label.toLowerCase()}</strong>, next-day Recovery
                      averaged <span className="tabular">{c.withAvg}%</span> vs{" "}
                      <span className="tabular">{c.withoutAvg}%</span> otherwise
                      {diff !== 0 && (
                        <> ({diff > 0 ? "+" : ""}
                          {diff} pts)</>
                      )}
                      .
                    </p>
                    <p className={styles.insightMeta}>
                      {c.withCount} night{c.withCount === 1 ? "" : "s"} with · {c.withoutCount} without — a
                      plain average, not a statistical test.
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
      </div>
    </div>
  );
}
