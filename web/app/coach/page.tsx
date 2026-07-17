"use client";

import { useEffect, useRef, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { Orb, type OrbState } from "@/components/Orb";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { minutesBetween } from "@/lib/sleepEstimate";
import { weekKey, computeStreak } from "@/lib/domainReach";
import { computeSleepPerformance, computeRecovery, recoveryBand, RECOVERY_COLOR } from "@/lib/whoopScores";
import { EMPTY_PROFILE, type UserProfile } from "@/lib/profile";
import styles from "./page.module.css";

const RECOVERY_ADVICE: Record<ReturnType<typeof recoveryBand>, string> = {
  high: "Recovery is high — a good day to push training intensity if you want to.",
  moderate: "Recovery is moderate — moderate activity is fine, but this isn't the day to max out.",
  low: "Recovery is low — today favors rest, light movement, or an easy walk over a hard session.",
};

type Entry = { who: "you" | "coach"; text: string; time: string; escalation?: boolean; error?: boolean };

interface SleepEntry {
  date: string;
  bedtime: string;
  wakeTime: string;
  quality: number;
  restingHeartRate?: string;
}
interface LoggedMeal {
  date: string;
  totalCalories: number | null;
}
interface WorkoutSession {
  id: string;
  date: string;
  title: string;
}
interface MindEntry {
  date: string;
  purposeRating: number;
  note: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionResultEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function timeNow() {
  return new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function sessionGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning check-in";
  if (h < 18) return "Midday check-in";
  return "Evening check-in";
}

export default function CoachPage() {
  const [profile] = useLocalStorageState<UserProfile | null>("lc_profile_v1", null);
  const [sleepEntries] = useLocalStorageState<SleepEntry[]>("lc_sleep_entries_v1", []);
  const [meals] = useLocalStorageState<LoggedMeal[]>("lc_meals_v1", []);
  const [fitnessDays] = useLocalStorageState<boolean[]>(
    `lc_fitness_${weekKey()}`,
    [false, false, false, false, false, false, false]
  );
  const [sessions] = useLocalStorageState<WorkoutSession[]>("lc_workout_sessions_v1", []);
  const [mindEntries] = useLocalStorageState<MindEntry[]>("lc_mind_entries_v1", []);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const startedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const p = profile ?? EMPTY_PROFILE;

  const todaySleepEntry = sleepEntries.find((e) => e.date === todayKey());
  const priorRHRs = sleepEntries
    .filter((e) => e.date < todayKey())
    .slice(-7)
    .map((e) => Number(e.restingHeartRate))
    .filter((n) => Number.isFinite(n) && n > 0);
  const restingHRBaseline = priorRHRs.length ? priorRHRs.reduce((s, v) => s + v, 0) / priorRHRs.length : null;
  const todayRHR = todaySleepEntry ? Number(todaySleepEntry.restingHeartRate) : NaN;
  const recovery = todaySleepEntry
    ? computeRecovery({
        sleepPerformance: computeSleepPerformance(todaySleepEntry),
        restingHR: Number.isFinite(todayRHR) && todayRHR > 0 ? todayRHR : undefined,
        restingHRBaseline,
      })
    : null;
  const band = recovery != null ? recoveryBand(recovery) : null;

  function buildContext(): string {
    const lines: string[] = [];
    const sleepEntry = sleepEntries.find((e) => e.date === todayKey());
    if (sleepEntry) {
      const hours = (minutesBetween(sleepEntry.bedtime, sleepEntry.wakeTime) / 60).toFixed(1);
      lines.push(`Sleep: ${hours}h logged last night, quality ${sleepEntry.quality}/5.`);
    } else {
      lines.push("Sleep: nothing logged for last night yet.");
    }

    const todaysMeals = meals.filter((m) => m.date === todayKey());
    if (todaysMeals.length) {
      const kcal = Math.round(todaysMeals.reduce((sum, m) => sum + (m.totalCalories || 0), 0));
      lines.push(`Nutrition: ${todaysMeals.length} meal${todaysMeals.length === 1 ? "" : "s"} logged today, about ${kcal} kcal so far.`);
    } else {
      lines.push("Nutrition: nothing logged today yet.");
    }

    const completedDays = fitnessDays.filter(Boolean).length;
    const lastSession = sessions[sessions.length - 1];
    lines.push(
      `Fitness: ${completedDays} of 7 days moved this week.${lastSession ? ` Last session: ${lastSession.title}.` : ""}`
    );

    const streak = computeStreak(mindEntries);
    const lastMind = mindEntries[mindEntries.length - 1];
    lines.push(
      streak > 0
        ? `Mind: ${streak}-day reflection streak.${lastMind?.note ? ` Last note: "${lastMind.note}".` : ""}`
        : "Mind: no reflection logged recently."
    );

    return lines.join("\n");
  }

  async function speak(text: string) {
    if (!voiceOn) return;
    try {
      const res = await fetch("/api/meditation-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, speed: 1.0 }),
      });
      if (res.status === 200 && audioRef.current) {
        const blob = await res.blob();
        audioRef.current.src = URL.createObjectURL(blob);
        setOrbState("speaking");
        await audioRef.current.play();
      }
    } catch {
      // silent fallback — the written reply already stands on its own
    }
  }

  async function sendToCoach(userText: string | null) {
    const isKickoff = userText === null;
    if (!isKickoff) {
      const trimmed = (userText || "").trim();
      if (!trimmed || busy) return;
      setEntries((e) => [...e, { who: "you", text: trimmed, time: timeNow() }]);
      setDraft("");
    }
    setBusy(true);
    setOrbState("thinking");

    const history = entries.map((e) => ({ role: e.who === "you" ? ("user" as const) : ("coach" as const), content: e.text }));

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: isKickoff
            ? "Open today's check-in. Reference at least one specific thing I've actually logged, in one or two short sentences, then ask one open question."
            : userText,
          history,
          context: buildContext(),
          tone: p.tone,
          intensity: p.intensity,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      const reply: string = data.reply || "";
      setEntries((e) => [...e, { who: "coach", text: reply, time: timeNow(), escalation: !!data.escalation }]);
      if (reply) void speak(reply);
    } catch {
      setEntries((e) => [
        ...e,
        {
          who: "coach",
          text: "That request didn't go through — try again in a moment.",
          time: timeNow(),
          error: true,
        },
      ]);
    } finally {
      setBusy(false);
      setOrbState((s) => (s === "speaking" ? s : "idle"));
    }
  }

  // Feature-detect the Web Speech API once, client-side only — Safari
  // desktop and Firefox don't support it, so the mic button simply
  // doesn't render there rather than pretending to work.
  useEffect(() => {
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) void sendToCoach(transcript);
    };
    recognition.onerror = () => {
      setListening(false);
      setOrbState("idle");
    };
    recognition.onend = () => {
      setListening(false);
    };
    recognitionRef.current = recognition;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMicSupported(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleMic() {
    const recognition = recognitionRef.current;
    if (!recognition || busy) return;
    if (listening) {
      recognition.stop();
      setListening(false);
      setOrbState("idle");
    } else {
      setListening(true);
      setOrbState("listening");
      recognition.start();
    }
  }

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void sendToCoach(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [entries]);

  return (
    <div className={styles.page}>
      <SiteNav active="/coach" />

      <div className={styles.hero}>
        <audio ref={audioRef} onEnded={() => setOrbState("idle")} style={{ display: "none" }} />
        <Orb state={orbState} size={200} />
        <span className="eyebrow" style={{ marginTop: "1.2em" }}>
          {sessionGreeting()}
        </span>
        <h1 className={styles.heroTitle}>
          {p.name ? `Hey ${p.name}, I'm here.` : "I'm here."}
        </h1>
        {band && recovery != null && (
          <div className={styles.recoveryPill}>
            <span className={styles.recoveryDot} style={{ background: RECOVERY_COLOR[band] }} aria-hidden="true" />
            <span className={`${styles.recoveryValue} tabular`}>{recovery}% recovery</span>
            <span className={styles.recoveryText}>{RECOVERY_ADVICE[band]}</span>
          </div>
        )}
      </div>

      <div className={styles.transcript}>
        <div className={styles.log} ref={logRef}>
          {entries.map((entry, i) => (
            <div className={styles.entry} key={i}>
              <div className={styles.entryMeta}>
                <span
                  className={`${styles.entryWho} ${
                    entry.who === "coach" ? styles.entryWhoCoach : styles.entryWhoUser
                  }`}
                >
                  {entry.who === "coach" ? "COACH" : "YOU"}
                </span>
                <span className={`${styles.entryTime} tabular`}>{entry.time}</span>
              </div>
              <p className={entry.escalation ? `${styles.entryText} ${styles.entryEscalation}` : styles.entryText}>
                {entry.text}
              </p>
            </div>
          ))}
          {busy && (
            <div className={styles.entry}>
              <div className={styles.entryMeta}>
                <span className={`${styles.entryWho} ${styles.entryWhoCoach}`}>COACH</span>
              </div>
              <div className={styles.typing} aria-label="Coach is thinking">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>

        <form
          className={styles.composer}
          onSubmit={(e) => {
            e.preventDefault();
            void sendToCoach(draft);
          }}
        >
          {micSupported && (
            <button
              type="button"
              className={listening ? `${styles.micButton} ${styles.micButtonActive}` : styles.micButton}
              onClick={toggleMic}
              disabled={busy}
              aria-pressed={listening}
              aria-label={listening ? "Stop listening" : "Talk to your coach"}
            >
              ●
            </button>
          )}
          <input
            className={styles.input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={listening ? "Listening…" : "Say what's actually going on…"}
            disabled={busy || listening}
          />
          <button type="submit" className={styles.sendButton} disabled={busy || !draft.trim()}>
            Send
          </button>
        </form>

        <div className={styles.footerRow}>
          <button
            type="button"
            className={voiceOn ? `${styles.voiceToggle} ${styles.voiceToggleActive}` : styles.voiceToggle}
            onClick={() => setVoiceOn((v) => !v)}
            aria-pressed={voiceOn}
          >
            {voiceOn ? "Spoken replies: on" : "Spoken replies: off"}
          </button>
          <p className={styles.instrumentNote}>
            A wellness coach, not a clinician — anything needing a real diagnosis gets a direct
            referral instead of a guess.
          </p>
        </div>
      </div>
    </div>
  );
}
