"use client";

import { useEffect, useRef, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { Orb, type OrbState } from "@/components/Orb";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { minutesBetween } from "@/lib/sleepEstimate";
import { weekKey, computeStreak } from "@/lib/domainReach";
import { computeSleepPerformance, computeRecovery, recoveryBand, RECOVERY_COLOR } from "@/lib/recoveryScores";
import { crossDomainInsights } from "@/lib/insights";
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
  disruptors?: string[];
  caffeineAfter?: string;
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
  mood: number;
  note: string;
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
  const [meditationSessions] = useLocalStorageState<{ date: string }[]>("lc_meditation_sessions_v1", []);

  const [entries, setEntries, entriesHydrated] = useLocalStorageState<Entry[]>("lc_coach_history_v1", []);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const startedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

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

  const hasEverLogged = sleepEntries.length > 0 || meals.length > 0 || sessions.length > 0 || mindEntries.length > 0;

  function demographicLine(): string | null {
    const parts: string[] = [];
    if (p.exactAge != null) parts.push(`${p.exactAge} years old`);
    if (p.sex && p.sex !== "Prefer not to say") parts.push(p.sex.toLowerCase());
    if (p.heightCm != null) parts.push(`${Math.round(p.heightCm)}cm tall`);
    if (p.weightKg != null) parts.push(`${Math.round(p.weightKg)}kg`);
    return parts.length ? `About them: ${parts.join(", ")}.` : null;
  }

  function buildContext(): string {
    const demo = demographicLine();
    const notes = p.onboardingNotes?.length
      ? `From onboarding, in their own words: ${p.onboardingNotes.join(" | ")}`
      : null;

    if (!hasEverLogged) {
      return [
        "This is a brand-new account — nothing has ever been logged in any domain (sleep, nutrition, fitness, or mind). Do not reference sleep, meals, movement, or mind check-ins as if you've seen any data, because you haven't.",
        demo,
        notes,
      ]
        .filter(Boolean)
        .join("\n");
    }

    const lines: string[] = [];
    if (demo) lines.push(demo);
    if (notes) lines.push(notes);
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

    const insights = crossDomainInsights({ sleepEntries, sessions, mindLogs: [...mindEntries, ...meditationSessions] });
    if (insights.length) {
      lines.push(
        `Real patterns already found in their own logged data: ${insights
          .map((i) => `${i.headline} — ${i.detail}`)
          .join(" ")}`
      );
    }

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
      setEntries((e) => [...e, { who: "you" as const, text: trimmed, time: timeNow() }].slice(-200));
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
            ? hasEverLogged
              ? "Open today's check-in. Reference at least one specific thing I've actually logged, in one or two short sentences, then ask one open question."
              : "This is the very first time this person has opened the coach and nothing has been logged in any domain yet. Give a short, warm one-sentence welcome — do not claim to have seen any data, movement, sleep, or anything else, because there is none — then ask one open question to get a sense of where they want to start."
            : userText,
          history,
          context: buildContext(),
          tone: p.tone,
          intensity: p.intensity,
          language: p.language || "English",
          allowWebSearch: p.webSearchEnabled !== false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      const reply: string = data.reply || "";
      setEntries((e) =>
        [...e, { who: "coach" as const, text: reply, time: timeNow(), escalation: !!data.escalation }].slice(-200)
      );
      if (reply) void speak(reply);
    } catch {
      setEntries((e) =>
        [
          ...e,
          {
            who: "coach" as const,
            text: "That request didn't go through — try again in a moment.",
            time: timeNow(),
            error: true,
          },
        ].slice(-200)
      );
    } finally {
      setBusy(false);
      setOrbState((s) => (s === "speaking" ? s : "idle"));
    }
  }

  const speech = useSpeechRecognition((transcript) => void sendToCoach(transcript));
  // The Orb shows "listening" for as long as recognition is actually
  // active, however it stopped (user toggled it, browser ended it, an
  // error fired) — derived straight from the hook's own state instead of
  // a separate effect trying to keep a second copy in sync.
  const displayOrbState: OrbState = speech.listening ? "listening" : orbState;

  function toggleMic() {
    if (busy) return;
    speech.toggle();
  }

  // Only ever auto-opens the conversation once, on a genuinely empty
  // history — the coach used to re-kick off a fresh "session" every time
  // this page mounted, which is exactly why it never felt like it
  // remembered anything. History now persists, so a return visit just
  // shows what was already said.
  useEffect(() => {
    if (!entriesHydrated || startedRef.current) return;
    startedRef.current = true;
    if (entries.length === 0) {
      const t = setTimeout(() => void sendToCoach(null), 0);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entriesHydrated]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [entries]);

  return (
    <div className={styles.page}>
      <SiteNav />

      <div className={styles.hero}>
        <audio ref={audioRef} onEnded={() => setOrbState("idle")} style={{ display: "none" }} />
        <Orb state={displayOrbState} size={200} />
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
          {speech.supported && (
            <button
              type="button"
              className={speech.listening ? `${styles.micButton} ${styles.micButtonActive}` : styles.micButton}
              onClick={toggleMic}
              disabled={busy}
              aria-pressed={speech.listening}
              aria-label={speech.listening ? "Stop listening" : "Talk to your coach"}
            >
              ●
            </button>
          )}
          <input
            className={styles.input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={speech.listening ? "Listening…" : "Say what's actually going on…"}
            disabled={busy || speech.listening}
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
