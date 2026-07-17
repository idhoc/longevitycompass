"use client";

import { useEffect, useRef, useState } from "react";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { dateKeyOffset, computeStreak } from "@/lib/domainReach";
import {
  MEDITATION_CATEGORIES,
  getCategory,
  getVariant,
  type MeditationFocus,
  type MeditationLength,
} from "@/lib/meditations";
import styles from "./panels.module.css";

interface MindEntry {
  date: string;
  purposeRating: number;
  connected: boolean;
  note: string;
}

interface MeditationSession {
  id: string;
  date: string;
  focus: MeditationFocus;
  length: MeditationLength;
  title: string;
}

interface AmbientHandle {
  stop: () => void;
}

function startAmbientTone(): AmbientHandle | null {
  try {
    const Ctx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.frequency.value = 110;
    osc2.frequency.value = 165;
    gain.gain.value = 0.0001;
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start();
    osc2.start();
    gain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 1.5);
    return {
      stop: () => {
        try {
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
          setTimeout(() => {
            osc1.stop();
            osc2.stop();
            ctx.close();
          }, 500);
        } catch {
          // already stopped
        }
      },
    };
  } catch {
    return null;
  }
}

interface FocusSession {
  id: string;
  date: string;
  minutes: number;
}

type Mode = "reflect" | "meditate" | "break";

const PROMPTS = [
  "What gave you a sense of purpose today?",
  "Who did you meaningfully connect with today?",
  "What's one thing you did today that mattered to someone else?",
  "What are you looking forward to tomorrow?",
  "When did you feel most like yourself today?",
  "What's something you're grateful for right now?",
  "What did you do today that felt worth doing?",
];

const BREAK_PRESETS = [25, 50];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function playBeep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 660;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // audio not available — the on-screen banner still shows
  }
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function BreakCountdown({ minutes, onComplete }: { minutes: number; onComplete: () => void }) {
  const [remaining, setRemaining] = useState(minutes * 60);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) {
      onComplete();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, running]);

  return (
    <div style={{ textAlign: "center" }}>
      <div className={`${styles.insightHeadline} tabular`} style={{ fontSize: "var(--text-xl)" }}>
        {formatTime(remaining)}
      </div>
      <button type="button" className={styles.btn} style={{ marginTop: "0.8em" }} onClick={() => setRunning((r) => !r)}>
        {running ? "Pause" : "Resume"}
      </button>
    </div>
  );
}

export function MindPanel() {
  const [mode, setMode] = useState<Mode>("reflect");

  const [entries, setEntries] = useLocalStorageState<MindEntry[]>("lc_mind_entries_v1", []);
  const [rating, setRating] = useState(3);
  const [connected, setConnected] = useState(false);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);

  const [meditationSessions, setMeditationSessions] = useLocalStorageState<MeditationSession[]>(
    "lc_meditation_sessions_v1",
    []
  );
  const [selectedFocus, setSelectedFocus] = useState<MeditationFocus | null>(null);
  const [length, setLength] = useState<MeditationLength>("short");
  const [pace, setPace] = useState<"normal" | "slow">("normal");
  const [ambientOn, setAmbientOn] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [usingBrowserVoice, setUsingBrowserVoice] = useState(false);
  const [breathLabel, setBreathLabel] = useState<"in" | "out">("in");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambientRef = useRef<AmbientHandle | null>(null);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setBreathLabel((l) => (l === "in" ? "out" : "in")), 4000);
    return () => clearInterval(t);
  }, [playing]);

  useEffect(() => {
    return () => {
      ambientRef.current?.stop();
    };
  }, []);

  const [, setFocusSessions] = useLocalStorageState<FocusSession[]>("lc_focus_sessions_v1", []);
  const [breakMinutes, setBreakMinutes] = useState<number | null>(null);
  const [breakKey, setBreakKey] = useState(0);
  const [breakDone, setBreakDone] = useState(false);

  const today = todayKey();
  const todaysEntry = entries.find((e) => e.date === today);
  const prompt = PROMPTS[dayOfYear() % PROMPTS.length];
  const streak = computeStreak(entries);
  const lastMeditation = meditationSessions[meditationSessions.length - 1];

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

  async function playMeditation(focus: MeditationFocus) {
    const variant = getVariant(focus, length);
    const category = getCategory(focus);
    if (!variant || !category) return;
    setSelectedFocus(focus);
    setLoadingAudio(true);
    setUsingBrowserVoice(false);
    setBreathLabel("in");
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    if (ambientOn) ambientRef.current = startAmbientTone();

    function recordSession() {
      setMeditationSessions((prev) => [
        ...prev,
        { id: `${Date.now()}`, date: todayKey(), focus, length, title: category!.title },
      ]);
    }

    function speakInBrowser() {
      setUsingBrowserVoice(true);
      setPlaying(true);
      const utter = new SpeechSynthesisUtterance(variant!.script);
      utter.rate = pace === "slow" ? 0.85 : 1.0;
      utter.onend = () => {
        setPlaying(false);
        ambientRef.current?.stop();
        ambientRef.current = null;
        recordSession();
      };
      window.speechSynthesis.speak(utter);
    }

    try {
      const res = await fetch("/api/meditation-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: variant.script, speed: pace === "slow" ? 0.85 : 1.0 }),
      });
      if (res.status === 200 && audioRef.current) {
        const blob = await res.blob();
        audioRef.current.src = URL.createObjectURL(blob);
        await audioRef.current.play();
        setPlaying(true);
      } else {
        speakInBrowser();
      }
    } catch {
      speakInBrowser();
    } finally {
      setLoadingAudio(false);
    }
  }

  function stopMeditation() {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    ambientRef.current?.stop();
    ambientRef.current = null;
    setPlaying(false);
    setSelectedFocus(null);
  }

  function startBreak(minutes: number) {
    setBreakMinutes(minutes);
    setBreakKey((k) => k + 1);
    setBreakDone(false);
  }

  function finishBreak() {
    playBeep();
    setBreakDone(true);
    if (breakMinutes) {
      setFocusSessions((prev) => [...prev, { id: `${Date.now()}`, date: todayKey(), minutes: breakMinutes }]);
    }
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

      <div className={styles.panelBody}>
        <div className={styles.tagRow} role="group" aria-label="Mind mode">
          <button
            type="button"
            className={mode === "reflect" ? `${styles.tag} ${styles.tagActive}` : styles.tag}
            onClick={() => setMode("reflect")}
            aria-pressed={mode === "reflect"}
          >
            Reflect
          </button>
          <button
            type="button"
            className={mode === "meditate" ? `${styles.tag} ${styles.tagActive}` : styles.tag}
            onClick={() => setMode("meditate")}
            aria-pressed={mode === "meditate"}
          >
            Meditate
          </button>
          <button
            type="button"
            className={mode === "break" ? `${styles.tag} ${styles.tagActive}` : styles.tag}
            onClick={() => setMode("break")}
            aria-pressed={mode === "break"}
          >
            Take a break
          </button>
        </div>

        {mode === "reflect" &&
          (showForm ? (
            <>
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
            </>
          ) : (
            <>
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
                      background: e ? (e.connected ? "#00f19f" : "#0093e7") : "var(--line)",
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
            </>
          ))}

        {mode === "meditate" && (
          <>
            <audio
              ref={audioRef}
              onEnded={() => {
                setPlaying(false);
                ambientRef.current?.stop();
                ambientRef.current = null;
                const category = selectedFocus ? getCategory(selectedFocus) : undefined;
                if (category && selectedFocus) {
                  setMeditationSessions((prev) => [
                    ...prev,
                    { id: `${Date.now()}`, date: todayKey(), focus: selectedFocus, length, title: category.title },
                  ]);
                }
              }}
              style={{ display: "none" }}
            />
            {playing ? (
              <div style={{ textAlign: "center" }}>
                <div
                  className={styles.breathingCircle}
                  aria-hidden="true"
                  style={{ margin: "0 auto" }}
                />
                <p className={styles.insightHeadline} style={{ marginTop: "0.8em" }}>
                  Breathe {breathLabel}
                </p>
                <p className={styles.emptyText} style={{ margin: "0.4em auto 0" }}>
                  {usingBrowserVoice ? "Playing via your browser's built-in voice." : "Playing…"}
                  {ambientOn && " · Ambient tone on."}
                </p>
                <button type="button" className={styles.btn} style={{ marginTop: "0.8em" }} onClick={stopMeditation}>
                  Stop
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.7em" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5em" }}>
                  {MEDITATION_CATEGORIES.map((c) => (
                    <button
                      key={c.focus}
                      type="button"
                      className={styles.meditationOption}
                      onClick={() => playMeditation(c.focus)}
                      disabled={loadingAudio}
                    >
                      <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}>{c.title}</span>
                      <span className={`${styles.panelMeta} tabular`} style={{ marginLeft: "0.6em" }}>
                        {getVariant(c.focus, length)?.minutes} min
                      </span>
                      <div className={styles.emptyText} style={{ margin: "0.2em 0 0", maxWidth: "none" }}>
                        {c.description}
                      </div>
                    </button>
                  ))}
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Length</span>
                  <div className={styles.tagRow}>
                    {(["short", "long"] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        className={length === l ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                        onClick={() => setLength(l)}
                        aria-pressed={length === l}
                      >
                        {l === "short" ? "Short" : "Long"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Pace</span>
                  <div className={styles.tagRow}>
                    {(["normal", "slow"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={pace === p ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                        onClick={() => setPace(p)}
                        aria-pressed={pace === p}
                      >
                        {p === "normal" ? "Normal" : "Slower"}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={ambientOn ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                      onClick={() => setAmbientOn((a) => !a)}
                      aria-pressed={ambientOn}
                    >
                      Ambient tone
                    </button>
                  </div>
                </div>
                {lastMeditation && (
                  <p className={styles.emptyText} style={{ margin: 0 }}>
                    Last session: {lastMeditation.title} ({lastMeditation.length})
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {mode === "break" && (
          <>
            {breakMinutes === null ? (
              <>
                <p className={styles.emptyText} style={{ margin: 0 }}>
                  A timed nudge to step away from the screen — this runs from a timer you set, not
                  your device&apos;s actual usage.
                </p>
                <div className={styles.tagRow}>
                  {BREAK_PRESETS.map((m) => (
                    <button key={m} type="button" className={styles.tag} onClick={() => startBreak(m)}>
                      {m} min focus block
                    </button>
                  ))}
                </div>
              </>
            ) : breakDone ? (
              <div style={{ textAlign: "center" }}>
                <p className={styles.insightHeadline}>Time for a mindful break.</p>
                <p className={styles.emptyText} style={{ margin: "0.4em auto 0" }}>
                  Stand up, look away from the screen, and let your eyes rest for a few minutes.
                </p>
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} style={{ marginTop: "0.8em" }} onClick={() => setBreakMinutes(null)}>
                  Start another
                </button>
              </div>
            ) : (
              <>
                <BreakCountdown key={breakKey} minutes={breakMinutes} onComplete={finishBreak} />
                <div className={styles.panelFooter}>
                  <button type="button" className={styles.btn} onClick={() => setBreakMinutes(null)}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
