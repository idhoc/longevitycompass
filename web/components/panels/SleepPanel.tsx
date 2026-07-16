"use client";

import { useState } from "react";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { estimateSleepStages, minutesBetween } from "@/lib/sleepEstimate";
import { StageBar } from "./StageBar";
import styles from "./panels.module.css";

interface SleepEntry {
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

interface SleepInsight {
  headline: string;
  explanation: string;
}

const DISRUPTOR_OPTIONS = ["Stress", "Screens", "Noise", "Temperature", "None"];

const DEFAULT_ENTRY: SleepEntry = {
  date: "",
  bedtime: "23:00",
  wakeTime: "07:00",
  quality: 3,
  awakenings: 1,
  disruptors: [],
  caffeineAfter: "",
  energyToday: "moderate",
  restingHeartRate: "",
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function SleepPanel() {
  const [entries, setEntries] = useLocalStorageState<SleepEntry[]>("lc_sleep_entries_v1", []);
  const entry = entries.find((e) => e.date === todayKey()) ?? null;
  const [draft, setDraft] = useState<SleepEntry>(DEFAULT_ENTRY);
  const [editing, setEditing] = useState(false);
  const [insight, setInsight] = useState<SleepInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  const durationMinutes = entry ? minutesBetween(entry.bedtime, entry.wakeTime) : 0;
  const stages = entry ? estimateSleepStages(entry.quality, entry.awakenings) : null;

  function toggleDisruptor(tag: string) {
    setDraft((d) => ({
      ...d,
      disruptors: d.disruptors.includes(tag)
        ? d.disruptors.filter((t) => t !== tag)
        : [...d.disruptors, tag],
    }));
  }

  function save() {
    const date = todayKey();
    setEntries((prev) => [...prev.filter((e) => e.date !== date), { ...draft, date }]);
    setEditing(false);
    setInsight(null);
    setInsightError(null);
  }

  async function fetchInsight() {
    if (!entry || !stages) return;
    setLoadingInsight(true);
    setInsightError(null);
    try {
      const total = durationMinutes;
      const res = await fetch("/api/sleep-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deepMinutes: Math.round((stages.deepPct / 100) * total),
          remMinutes: Math.round((stages.remPct / 100) * total),
          lightMinutes: Math.round((stages.lightPct / 100) * total),
          awakeMinutes: Math.round((stages.awakePct / 100) * total),
          restingHeartRate: entry.restingHeartRate ? Number(entry.restingHeartRate) : undefined,
          bedtime: entry.bedtime,
          wakeTime: entry.wakeTime,
          disruptors: entry.disruptors,
          caffeineAfter: entry.caffeineAfter || undefined,
          energyToday: entry.energyToday,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setInsight(data.insight);
    } catch (err) {
      setInsightError(err instanceof Error ? err.message : "Couldn't get an insight right now.");
    } finally {
      setLoadingInsight(false);
    }
  }

  const showForm = editing || !entry;

  return (
    <section className={styles.panel} aria-labelledby="sleep-panel-title">
      <div className={styles.panelHead}>
        <div>
          <span className={styles.panelLabel}>Sleep &amp; Recovery</span>
          <h3 className={styles.panelTitle} id="sleep-panel-title">
            {entry ? `${(durationMinutes / 60).toFixed(1)}h logged` : "Not logged yet"}
          </h3>
        </div>
        {entry && !showForm && (
          <span className={`${styles.panelMeta} tabular`}>{entry.restingHeartRate ? `${entry.restingHeartRate} bpm` : ""}</span>
        )}
      </div>

      {showForm ? (
        <div className={styles.panelBody}>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="sleep-bedtime">Bedtime</label>
              <input
                id="sleep-bedtime"
                className={styles.input}
                type="time"
                value={draft.bedtime}
                onChange={(e) => setDraft((d) => ({ ...d, bedtime: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="sleep-wake">Wake time</label>
              <input
                id="sleep-wake"
                className={styles.input}
                type="time"
                value={draft.wakeTime}
                onChange={(e) => setDraft((d) => ({ ...d, wakeTime: e.target.value }))}
              />
            </div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="sleep-quality">Quality (1-5)</label>
              <input
                id="sleep-quality"
                className={styles.input}
                type="number"
                min={1}
                max={5}
                value={draft.quality}
                onChange={(e) => setDraft((d) => ({ ...d, quality: Number(e.target.value) }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="sleep-awakenings">Times woken</label>
              <input
                id="sleep-awakenings"
                className={styles.input}
                type="number"
                min={0}
                max={10}
                value={draft.awakenings}
                onChange={(e) => setDraft((d) => ({ ...d, awakenings: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="sleep-caffeine">Last caffeine</label>
              <input
                id="sleep-caffeine"
                className={styles.input}
                type="time"
                value={draft.caffeineAfter}
                onChange={(e) => setDraft((d) => ({ ...d, caffeineAfter: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="sleep-hr">Resting HR (optional)</label>
              <input
                id="sleep-hr"
                className={styles.input}
                type="number"
                placeholder="bpm"
                value={draft.restingHeartRate}
                onChange={(e) => setDraft((d) => ({ ...d, restingHeartRate: e.target.value }))}
              />
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>What got in the way?</span>
            <div className={styles.tagRow}>
              {DISRUPTOR_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={draft.disruptors.includes(tag) ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                  onClick={() => toggleDisruptor(tag)}
                  aria-pressed={draft.disruptors.includes(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="sleep-energy">Energy today</label>
            <select
              id="sleep-energy"
              className={styles.select}
              value={draft.energyToday}
              onChange={(e) => setDraft((d) => ({ ...d, energyToday: e.target.value as SleepEntry["energyToday"] }))}
            >
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className={styles.panelFooter}>
            {entry && (
              <button type="button" className={styles.btn} onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={save}>
              Save last night
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.panelBody}>
          {stages && <StageBar {...stages} />}
          <p className={styles.emptyText} style={{ marginTop: 0 }}>
            Estimated from your check-in (quality, awakenings) against typical adult
            proportions — not a measurement. Connecting a wearable would replace this with
            real stage data.
          </p>
          {insight ? (
            <div className={styles.insight}>
              <p className={styles.insightHeadline}>{insight.headline}</p>
              <p className={styles.insightExplanation}>{insight.explanation}</p>
            </div>
          ) : (
            <div className={styles.panelFooter}>
              <button
                type="button"
                className={styles.btn}
                onClick={() => {
                  if (entry) setDraft(entry);
                  setEditing(true);
                }}
              >
                Update
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={fetchInsight}
                disabled={loadingInsight}
              >
                {loadingInsight ? "Thinking…" : "Why am I tired?"}
              </button>
            </div>
          )}
          {insightError && (
            <p className={styles.emptyText} role="alert">
              {insightError}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
