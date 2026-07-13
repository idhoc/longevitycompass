"use client";

import { useState } from "react";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { dateKeyOffset, computeStreak } from "@/lib/domainReach";
import styles from "./panels.module.css";

interface MindEntry {
  date: string;
  purposeRating: number;
  connected: boolean;
  note: string;
}

const PROMPTS = [
  "What gave you a sense of purpose today?",
  "Who did you meaningfully connect with today?",
  "What's one thing you did today that mattered to someone else?",
  "What are you looking forward to tomorrow?",
  "When did you feel most like yourself today?",
  "What's something you're grateful for right now?",
  "What did you do today that felt worth doing?",
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

export function MindPanel() {
  const [entries, setEntries] = useLocalStorageState<MindEntry[]>("lc_mind_entries_v1", []);
  const [rating, setRating] = useState(3);
  const [connected, setConnected] = useState(false);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);

  const today = todayKey();
  const todaysEntry = entries.find((e) => e.date === today);
  const prompt = PROMPTS[dayOfYear() % PROMPTS.length];
  const streak = computeStreak(entries);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = dateKeyOffset(6 - i);
    return entries.find((e) => e.date === date) ?? null;
  });

  function save() {
    setEntries((prev) => [...prev.filter((e) => e.date !== today), { date: today, purposeRating: rating, connected, note }]);
    setEditing(false);
  }

  function startEdit() {
    if (todaysEntry) {
      setRating(todaysEntry.purposeRating);
      setConnected(todaysEntry.connected);
      setNote(todaysEntry.note);
    }
    setEditing(true);
  }

  const showForm = editing || !todaysEntry;

  return (
    <section className={styles.panel} aria-labelledby="mind-panel-title">
      <div className={styles.panelHead}>
        <div>
          <span className={styles.panelLabel}>Mind &amp; Purpose</span>
          <h3 className={styles.panelTitle} id="mind-panel-title">
            {streak > 0 ? `${streak} day streak` : "Not logged yet"}
          </h3>
        </div>
      </div>

      {showForm ? (
        <div className={styles.panelBody}>
          <p className={styles.emptyText} style={{ margin: 0 }}>{prompt}</p>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="mind-rating">Sense of purpose today (1-5)</label>
            <input
              id="mind-rating"
              className={styles.input}
              type="number"
              min={1}
              max={5}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Notes (optional)</span>
            <textarea
              className={styles.input}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A sentence is enough."
            />
          </div>
          <button
            type="button"
            className={connected ? `${styles.tag} ${styles.tagActive}` : styles.tag}
            onClick={() => setConnected((c) => !c)}
            aria-pressed={connected}
            style={{ alignSelf: "flex-start" }}
          >
            Had a meaningful connection today
          </button>
          <div className={styles.panelFooter}>
            {todaysEntry && (
              <button type="button" className={styles.btn} onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={save}>
              Save today
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.panelBody}>
          <div
            role="img"
            aria-label={`Purpose rating over the last 7 days: ${last7
              .map((e) => (e ? `${e.purposeRating} of 5` : "not logged"))
              .join(", ")}`}
            style={{ display: "flex", alignItems: "flex-end", gap: "0.5em", height: 64 }}
          >
            {last7.map((e, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: e ? `${(e.purposeRating / 5) * 100}%` : "6%",
                  minHeight: 4,
                  borderRadius: 3,
                  background: e ? (e.connected ? "#6fcb8f" : "#3e6b4f") : "var(--line)",
                }}
              />
            ))}
          </div>
          {todaysEntry?.note && (
            <p className={styles.emptyText} style={{ margin: 0 }}>&ldquo;{todaysEntry.note}&rdquo;</p>
          )}
          <div className={styles.panelFooter}>
            <button type="button" className={styles.btn} onClick={startEdit}>
              Update today
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
