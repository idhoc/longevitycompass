"use client";

import { useEffect, useRef, useState } from "react";
import { PenLine, Wind, Timer, Waves } from "lucide-react";
import { Orb } from "@/components/Orb";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { dateKeyOffset, computeStreak } from "@/lib/domainReach";
import {
  MEDITATION_CATEGORIES,
  getCategory,
  getVariant,
  type MeditationFocus,
  type MeditationLength,
} from "@/lib/meditations";
import { playAmbientSound, type AmbientSoundType, type AmbientSoundHandle } from "@/lib/ambientSounds";
import styles from "./panels.module.css";

/** The named AI companion behind "Reflect" — Headspace has Ebb; this is
 * ours. A real back-and-forth conversation via /api/wren-chat, not a
 * one-shot insight — Wren is a guidance-counselor-style companion, never
 * a therapist, and says so plainly if the conversation needs more than
 * this app can offer. */
const COMPANION_NAME = "Wren";

interface MindEntry {
  date: string;
  mood: number;
  note: string;
}

interface WrenTurn {
  who: "you" | "wren";
  text: string;
  time: string;
  escalation?: boolean;
}

function timeNow() {
  return new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const MOODS = [
  { value: 1, label: "Drained" },
  { value: 2, label: "Low" },
  { value: 3, label: "Steady" },
  { value: 4, label: "Good" },
  { value: 5, label: "Energized" },
];

const MOOD_LABEL: Record<number, string> = Object.fromEntries(MOODS.map((m) => [m.value, m.label]));

const VOICE_OPTIONS = [
  { id: "nova", label: "Nova" },
  { id: "shimmer", label: "Shimmer" },
  { id: "onyx", label: "Onyx" },
  { id: "fable", label: "Fable" },
];

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

type Mode = "reflect" | "meditate" | "break" | "sounds";

const SOUND_OPTIONS: { key: AmbientSoundType; label: string }[] = [
  { key: "white", label: "White noise" },
  { key: "rain", label: "Rain" },
  { key: "ocean", label: "Ocean" },
];

const SLEEP_TIMER_OPTIONS = [15, 30, 60] as const;

const PROMPTS = [
  "What gave you a sense of purpose today?",
  "Who did you meaningfully connect with today?",
  "What's one thing you did today that mattered to someone else?",
  "What are you looking forward to tomorrow?",
  "When did you feel most like yourself today?",
  "What's something you're grateful for right now?",
  "What did you do today that felt worth doing?",
];

const FOCUS_PRESETS = [25, 50] as const;

type BreathPhase = "inhale" | "hold1" | "exhale" | "hold2";
const BREATH_CYCLE: BreathPhase[] = ["inhale", "hold1", "exhale", "hold2"];
const BREATH_LABEL: Record<BreathPhase, string> = {
  inhale: "Breathe in",
  hold1: "Hold",
  exhale: "Breathe out",
  hold2: "Hold",
};
const BREATH_SCALE: Record<BreathPhase, number> = {
  inhale: 1.22,
  hold1: 1.22,
  exhale: 0.85,
  hold2: 0.85,
};

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

type PomodoroPhase = "focus" | "shortBreak";

/**
 * A real pomodoro cycle, not a single countdown to nothing: focus runs
 * out, beeps, logs the block, and rolls straight into a short break —
 * which rolls straight back into the next focus block — until the person
 * ends the session. Each completed focus block is what gets logged.
 */
function PomodoroTimer({
  focusMinutes,
  breakMinutes,
  onFocusComplete,
}: {
  focusMinutes: number;
  breakMinutes: number;
  onFocusComplete: () => void;
}) {
  const [phase, setPhase] = useState<PomodoroPhase>("focus");
  const [remaining, setRemaining] = useState(focusMinutes * 60);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) {
      const t = setTimeout(() => {
        playBeep();
        if (phase === "focus") {
          onFocusComplete();
          setPhase("shortBreak");
          setRemaining(breakMinutes * 60);
        } else {
          setPhase("focus");
          setRemaining(focusMinutes * 60);
        }
      }, 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, running, phase]);

  const total = (phase === "focus" ? focusMinutes : breakMinutes) * 60;
  const pct = total > 0 ? 1 - remaining / total : 0;

  return (
    <div style={{ textAlign: "center" }}>
      <span className={styles.panelLabel}>{phase === "focus" ? "Focus" : "Short break"}</span>
      <div className={`${styles.insightHeadline} tabular`} style={{ fontSize: "var(--text-xl)", marginTop: "0.2em" }}>
        {formatTime(remaining)}
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: "var(--paper-sunken)",
          overflow: "hidden",
          margin: "0.7em 0",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct * 100}%`,
            background: phase === "focus" ? "var(--mind)" : "var(--signal)",
            transition: "width 0.9s linear",
          }}
        />
      </div>
      <button type="button" className={styles.btn} onClick={() => setRunning((r) => !r)}>
        {running ? "Pause" : "Resume"}
      </button>
    </div>
  );
}

export function MindPanel() {
  const [mode, setMode] = useState<Mode>("reflect");

  useEffect(() => {
    const topic = new URLSearchParams(window.location.search).get("topic");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (topic === "meditate" || topic === "break" || topic === "reflect" || topic === "sounds") setMode(topic);
  }, []);

  const [entries, setEntries] = useLocalStorageState<MindEntry[]>("lc_mind_entries_v1", []);
  const [mood, setMood] = useState(3);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [wrenHistory, setWrenHistory] = useLocalStorageState<WrenTurn[]>("lc_wren_chat_v1", []);
  const [wrenBusy, setWrenBusy] = useState(false);
  const [wrenDraft, setWrenDraft] = useState("");
  const [wrenVoiceOn, setWrenVoiceOn] = useState(false);
  const wrenAudioRef = useRef<HTMLAudioElement | null>(null);
  const wrenLogRef = useRef<HTMLDivElement | null>(null);

  const [meditationSessions, setMeditationSessions] = useLocalStorageState<MeditationSession[]>(
    "lc_meditation_sessions_v1",
    []
  );
  const [selectedFocus, setSelectedFocus] = useState<MeditationFocus | null>(null);
  const [length, setLength] = useState<MeditationLength>("short");
  const [pace, setPace] = useState<"normal" | "slow">("normal");
  const [ambientOn, setAmbientOn] = useState(false);
  const [voicePref, setVoicePref] = useLocalStorageState<string>("lc_voice_pref_v1", "nova");
  const [playing, setPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [usingBrowserVoice, setUsingBrowserVoice] = useState(false);
  const [breathPhase, setBreathPhase] = useState<BreathPhase>("inhale");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambientRef = useRef<AmbientHandle | null>(null);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setBreathPhase((p) => BREATH_CYCLE[(BREATH_CYCLE.indexOf(p) + 1) % BREATH_CYCLE.length]), 4000);
    return () => clearInterval(t);
  }, [playing]);

  useEffect(() => {
    return () => {
      ambientRef.current?.stop();
    };
  }, []);

  const [focusSessions, setFocusSessions] = useLocalStorageState<FocusSession[]>("lc_focus_sessions_v1", []);
  const [focusLen, setFocusLen] = useState<(typeof FOCUS_PRESETS)[number]>(25);
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroKey, setPomodoroKey] = useState(0);

  const [playingSound, setPlayingSound] = useState<AmbientSoundType | null>(null);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<(typeof SLEEP_TIMER_OPTIONS)[number] | null>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const soundHandleRef = useRef<AmbientSoundHandle | null>(null);

  useEffect(() => {
    return () => {
      soundHandleRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (sleepTimerRemaining == null) return;
    if (sleepTimerRemaining <= 0) {
      stopSound();
      return;
    }
    const t = setTimeout(() => setSleepTimerRemaining((r) => (r != null ? r - 1 : r)), 1000);
    return () => clearTimeout(t);
  }, [sleepTimerRemaining]);

  function startSound(type: AmbientSoundType) {
    soundHandleRef.current?.stop();
    soundHandleRef.current = playAmbientSound(type);
    setPlayingSound(type);
    setSleepTimerRemaining(sleepTimerMinutes != null ? sleepTimerMinutes * 60 : null);
  }

  function stopSound() {
    soundHandleRef.current?.stop();
    soundHandleRef.current = null;
    setPlayingSound(null);
    setSleepTimerRemaining(null);
  }

  const today = todayKey();
  const todaysEntry = entries.find((e) => e.date === today);
  const prompt = PROMPTS[dayOfYear() % PROMPTS.length];
  const streak = computeStreak(entries);
  const lastMeditation = meditationSessions[meditationSessions.length - 1];
  const breakLen = focusLen === 50 ? 10 : 5;
  const todaysFocusBlocks = focusSessions.filter((s) => s.date === today);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = dateKeyOffset(6 - i);
    return entries.find((e) => e.date === date) ?? null;
  });

  function save() {
    setEntries((prev) => [...prev.filter((e) => e.date !== today), { date: today, mood, note }]);
    setEditing(false);
  }

  function startEdit() {
    if (todaysEntry) {
      setMood(todaysEntry.mood);
      setNote(todaysEntry.note);
    }
    setEditing(true);
  }

  async function speakWren(text: string) {
    if (!wrenVoiceOn) return;
    try {
      const res = await fetch("/api/meditation-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, speed: 1.0 }),
      });
      if (res.status === 200 && wrenAudioRef.current) {
        const blob = await res.blob();
        wrenAudioRef.current.src = URL.createObjectURL(blob);
        await wrenAudioRef.current.play();
      }
    } catch {
      // silent fallback — the written reply already stands on its own
    }
  }

  async function sendToWren(userText: string | null) {
    const isKickoff = userText === null;
    if (!isKickoff) {
      const trimmed = (userText || "").trim();
      if (!trimmed || wrenBusy) return;
      setWrenHistory((h) => [...h, { who: "you" as const, text: trimmed, time: timeNow() }].slice(-200));
      setWrenDraft("");
    }
    setWrenBusy(true);

    const history = wrenHistory.map((t) => ({ role: t.who === "you" ? ("user" as const) : ("wren" as const), content: t.text }));
    const recentNotes = entries
      .filter((e) => e.date !== today)
      .slice(-5)
      .map((e) => `${MOOD_LABEL[e.mood] ?? e.mood}${e.note ? ` ("${e.note}")` : ""}`)
      .join("; ");
    const context = [
      todaysEntry
        ? `Today's mood: ${MOOD_LABEL[todaysEntry.mood] ?? todaysEntry.mood}.${todaysEntry.note ? ` Today's note: "${todaysEntry.note}".` : ""}`
        : "No mood logged today yet.",
      recentNotes ? `Recent days, for pattern context only: ${recentNotes}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    try {
      const res = await fetch("/api/wren-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: isKickoff
            ? todaysEntry?.note.trim()
              ? "Open our conversation about today — reflect back something specific from what I wrote, in one short sentence, then ask one open question."
              : "Open our conversation in one short warm sentence based on my mood rating today, then ask one open question."
            : userText,
          history,
          context,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      const reply: string = data.reply || "";
      setWrenHistory((h) =>
        [...h, { who: "wren" as const, text: reply, time: timeNow(), escalation: !!data.escalation }].slice(-200)
      );
      if (reply) void speakWren(reply);
    } catch {
      setWrenHistory((h) =>
        [...h, { who: "wren" as const, text: "That didn't go through — try again in a moment.", time: timeNow() }].slice(-200)
      );
    } finally {
      setWrenBusy(false);
    }
  }

  const wrenSpeech = useSpeechRecognition((transcript) => void sendToWren(transcript));

  useEffect(() => {
    wrenLogRef.current?.scrollTo({ top: wrenLogRef.current.scrollHeight, behavior: "smooth" });
  }, [wrenHistory]);

  async function playMeditation(focus: MeditationFocus) {
    const variant = getVariant(focus, length);
    const category = getCategory(focus);
    if (!variant || !category) return;
    setSelectedFocus(focus);
    setLoadingAudio(true);
    setUsingBrowserVoice(false);
    setBreathPhase("inhale");
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
        body: JSON.stringify({ text: variant.script, speed: pace === "slow" ? 0.85 : 1.0, voice: voicePref }),
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

  function startPomodoro() {
    setPomodoroKey((k) => k + 1);
    setPomodoroActive(true);
  }

  function logFocusBlock() {
    setFocusSessions((prev) => [...prev, { id: `${Date.now()}`, date: todayKey(), minutes: focusLen }]);
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
        <div className={styles.mindModeGrid} role="group" aria-label="Mind mode">
          <button
            type="button"
            data-tour="wren"
            className={mode === "reflect" ? `${styles.mindModeCard} ${styles.mindModeCardActive}` : styles.mindModeCard}
            style={{ background: "var(--mind)" }}
            onClick={() => setMode("reflect")}
            aria-pressed={mode === "reflect"}
          >
            <PenLine className={styles.mindModeIcon} aria-hidden="true" />
            <span className={styles.mindModeTitle}>Reflect</span>
            <span className={styles.mindModeStat}>{streak > 0 ? `${streak} day streak` : "Start today"}</span>
          </button>
          <button
            type="button"
            data-tour="mindMeditate"
            className={mode === "meditate" ? `${styles.mindModeCard} ${styles.mindModeCardActive}` : styles.mindModeCard}
            style={{ background: "var(--signal)" }}
            onClick={() => setMode("meditate")}
            aria-pressed={mode === "meditate"}
          >
            <Wind className={styles.mindModeIcon} aria-hidden="true" />
            <span className={styles.mindModeTitle}>Meditate</span>
            <span className={styles.mindModeStat}>{lastMeditation ? `Last: ${lastMeditation.title}` : "Guided & narrated"}</span>
          </button>
          <button
            type="button"
            data-tour="mindFocus"
            className={mode === "break" ? `${styles.mindModeCard} ${styles.mindModeCardActive}` : styles.mindModeCard}
            style={{ background: "var(--caution)" }}
            onClick={() => setMode("break")}
            aria-pressed={mode === "break"}
          >
            <Timer className={styles.mindModeIcon} aria-hidden="true" />
            <span className={styles.mindModeTitle}>Focus timer</span>
            <span className={styles.mindModeStat}>
              {todaysFocusBlocks.length > 0 ? `${todaysFocusBlocks.length} block${todaysFocusBlocks.length === 1 ? "" : "s"} today` : "Real pomodoro cycle"}
            </span>
          </button>
          <button
            type="button"
            data-tour="mindSounds"
            className={mode === "sounds" ? `${styles.mindModeCard} ${styles.mindModeCardActive}` : styles.mindModeCard}
            style={{ background: "var(--strain)" }}
            onClick={() => setMode("sounds")}
            aria-pressed={mode === "sounds"}
          >
            <Waves className={styles.mindModeIcon} aria-hidden="true" />
            <span className={styles.mindModeTitle}>Sounds</span>
            <span className={styles.mindModeStat}>{playingSound ? `Playing: ${playingSound}` : "White noise, rain, ocean"}</span>
          </button>
        </div>

        {mode === "reflect" &&
          (showForm ? (
            <>
              <p className={styles.emptyText} style={{ margin: 0 }}>{prompt}</p>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>How are you feeling today</span>
                <div className={styles.tagRow} role="group" aria-label="Mood today">
                  {MOODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      className={mood === m.value ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                      onClick={() => setMood(m.value)}
                      aria-pressed={mood === m.value}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>What&apos;s actually going on (optional)</span>
                <textarea
                  className={styles.input}
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Write as much or as little as you want — this is what gets reflected on, not tossed into the void."
                />
              </div>
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
                aria-label={`Mood over the last 7 days: ${last7
                  .map((e) => (e ? MOOD_LABEL[e.mood] ?? String(e.mood) : "not logged"))
                  .join(", ")}`}
                style={{ display: "flex", alignItems: "flex-end", gap: "0.5em", height: 64 }}
              >
                {last7.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: e ? `${(e.mood / 5) * 100}%` : "6%",
                      minHeight: 4,
                      borderRadius: 3,
                      background: e ? "var(--mind)" : "var(--line)",
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
                {wrenHistory.length === 0 && todaysEntry?.note.trim() && (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={() => void sendToWren(null)}
                    disabled={wrenBusy}
                  >
                    {wrenBusy ? `${COMPANION_NAME} is thinking…` : `Talk to ${COMPANION_NAME}`}
                  </button>
                )}
              </div>

              {wrenHistory.length > 0 && (
                <div className={styles.wrenChat}>
                  <div className={styles.wrenHead}>
                    <span className={styles.panelLabel}>{COMPANION_NAME}</span>
                    <button
                      type="button"
                      className={wrenVoiceOn ? `${styles.wrenVoiceToggle} ${styles.wrenVoiceToggleActive}` : styles.wrenVoiceToggle}
                      onClick={() => setWrenVoiceOn((v) => !v)}
                      aria-pressed={wrenVoiceOn}
                    >
                      {wrenVoiceOn ? "Spoken replies: on" : "Spoken replies: off"}
                    </button>
                  </div>
                  <audio ref={wrenAudioRef} style={{ display: "none" }} />
                  <div className={styles.wrenLog} ref={wrenLogRef}>
                    {wrenHistory.map((turn, i) => (
                      <div className={styles.wrenEntry} key={i}>
                        <div className={styles.wrenEntryMeta}>
                          <span
                            className={
                              turn.who === "wren"
                                ? `${styles.wrenEntryWho} ${styles.wrenEntryWhoWren}`
                                : styles.wrenEntryWho
                            }
                          >
                            {turn.who === "wren" ? COMPANION_NAME.toUpperCase() : "YOU"}
                          </span>
                          <span className={`${styles.wrenEntryTime} tabular`}>{turn.time}</span>
                        </div>
                        <p className={turn.escalation ? `${styles.wrenEntryText} ${styles.wrenEscalation}` : styles.wrenEntryText}>
                          {turn.text}
                        </p>
                      </div>
                    ))}
                    {wrenBusy && (
                      <div className={styles.wrenEntry}>
                        <div className={styles.wrenEntryMeta}>
                          <span className={`${styles.wrenEntryWho} ${styles.wrenEntryWhoWren}`}>
                            {COMPANION_NAME.toUpperCase()}
                          </span>
                        </div>
                        <div className={styles.typing} aria-label={`${COMPANION_NAME} is thinking`}>
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    )}
                  </div>
                  <form
                    className={styles.wrenComposer}
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendToWren(wrenDraft);
                    }}
                  >
                    {wrenSpeech.supported && (
                      <button
                        type="button"
                        className={wrenSpeech.listening ? `${styles.wrenMicButton} ${styles.wrenMicButtonActive}` : styles.wrenMicButton}
                        onClick={wrenSpeech.toggle}
                        disabled={wrenBusy}
                        aria-pressed={wrenSpeech.listening}
                        aria-label={wrenSpeech.listening ? "Stop listening" : `Talk out loud to ${COMPANION_NAME}`}
                      >
                        ●
                      </button>
                    )}
                    <input
                      className={styles.input}
                      value={wrenDraft}
                      onChange={(e) => setWrenDraft(e.target.value)}
                      placeholder={wrenSpeech.listening ? "Listening…" : "Say what's on your mind…"}
                      disabled={wrenBusy || wrenSpeech.listening}
                    />
                    <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={wrenBusy || !wrenDraft.trim()}>
                      Send
                    </button>
                  </form>
                  <p className={styles.wrenDisclaimer}>
                    {COMPANION_NAME} is a supportive companion, not a therapist — for anything heavier than a daily
                    reflection, a licensed professional or a crisis line is the better fit than this app.
                  </p>
                </div>
              )}
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
                <div className={styles.breathRing} data-phase={breathPhase}>
                  <div
                    style={{
                      margin: "0 auto",
                      width: "fit-content",
                      transform: `scale(${BREATH_SCALE[breathPhase]})`,
                      transition: "transform 4s ease-in-out",
                    }}
                  >
                    <Orb state="idle" size={160} color="var(--mind)" />
                  </div>
                </div>
                <p className={styles.insightHeadline} style={{ marginTop: "0.8em" }}>
                  {BREATH_LABEL[breathPhase]}
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
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>{c.title}</span>
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
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Voice</span>
                  <div className={styles.tagRow}>
                    {VOICE_OPTIONS.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className={voicePref === v.id ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                        onClick={() => setVoicePref(v.id)}
                        aria-pressed={voicePref === v.id}
                      >
                        {v.label}
                      </button>
                    ))}
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
            {!pomodoroActive ? (
              <>
                <p className={styles.emptyText} style={{ margin: 0 }}>
                  A real focus cycle: work, then a short break, automatically — running until you
                  end it, with every completed focus block logged.
                </p>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Focus length</span>
                  <div className={styles.tagRow}>
                    {FOCUS_PRESETS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={focusLen === m ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                        onClick={() => setFocusLen(m)}
                        aria-pressed={focusLen === m}
                      >
                        {m} min focus / {m === 50 ? 10 : 5} min break
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.panelFooter}>
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={startPomodoro}>
                    Start focus session
                  </button>
                </div>
                {todaysFocusBlocks.length > 0 && (
                  <p className={styles.emptyText} style={{ margin: 0 }}>
                    {todaysFocusBlocks.length} focus block{todaysFocusBlocks.length === 1 ? "" : "s"} completed today.
                  </p>
                )}
              </>
            ) : (
              <>
                <PomodoroTimer
                  key={pomodoroKey}
                  focusMinutes={focusLen}
                  breakMinutes={breakLen}
                  onFocusComplete={logFocusBlock}
                />
                <div className={styles.panelFooter}>
                  <button type="button" className={styles.btn} onClick={() => setPomodoroActive(false)}>
                    End session
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {mode === "sounds" && (
          <>
            <p className={styles.emptyText} style={{ margin: 0 }}>
              Real synthesized ambient audio, generated in your browser — no files to download,
              loops until you stop it.
            </p>
            <div className={styles.tagRow}>
              {SOUND_OPTIONS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={playingSound === s.key ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                  onClick={() => startSound(s.key)}
                  aria-pressed={playingSound === s.key}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {playingSound && (
              <>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Stop playing after</span>
                  <div className={styles.tagRow}>
                    {SLEEP_TIMER_OPTIONS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={sleepTimerMinutes === m ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                        onClick={() => {
                          setSleepTimerMinutes(m);
                          setSleepTimerRemaining(m * 60);
                        }}
                        aria-pressed={sleepTimerMinutes === m}
                      >
                        {m} min
                      </button>
                    ))}
                    <button
                      type="button"
                      className={sleepTimerMinutes === null ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                      onClick={() => {
                        setSleepTimerMinutes(null);
                        setSleepTimerRemaining(null);
                      }}
                      aria-pressed={sleepTimerMinutes === null}
                    >
                      No limit
                    </button>
                  </div>
                </div>
                {sleepTimerRemaining != null && (
                  <p className={`${styles.panelMeta} tabular`} style={{ margin: 0 }}>
                    Stopping in {formatTime(sleepTimerRemaining)}
                  </p>
                )}
                <div className={styles.panelFooter}>
                  <button type="button" className={styles.btn} onClick={stopSound}>
                    Stop
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
