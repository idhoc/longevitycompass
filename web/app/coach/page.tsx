"use client";

import { useEffect, useRef, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { Waveform, type VoiceState } from "@/components/Waveform";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { minutesBetween } from "@/lib/sleepEstimate";
import { weekKey, computeStreak } from "@/lib/domainReach";
import { EMPTY_PROFILE, type UserProfile } from "@/lib/profile";
import styles from "./page.module.css";

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
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const startedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const p = profile ?? EMPTY_PROFILE;

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
        setVoiceState("speaking");
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
    setVoiceState("thinking");

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
      setVoiceState((s) => (s === "speaking" ? s : "idle"));
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
      <div className={styles.body}>
        <div className={styles.transcript}>
          <div className={styles.sessionHead}>
            <span className="eyebrow">{sessionGreeting()}</span>
            <span className={`${styles.sessionDate} tabular`}>
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </span>
          </div>
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
            <input
              className={styles.input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Say what's actually going on…"
              disabled={busy}
            />
            <button type="submit" className={styles.sendButton} disabled={busy || !draft.trim()}>
              Send
            </button>
          </form>
        </div>

        <aside className={styles.instrument}>
          <audio ref={audioRef} onEnded={() => setVoiceState("idle")} style={{ display: "none" }} />
          <div className={styles.instrumentTop}>
            <span className="eyebrow">Signal</span>
            <span className={styles.stateLabel}>{voiceState}</span>
          </div>
          <Waveform state={voiceState} className={styles.waveform} />
          <button
            type="button"
            className={voiceOn ? `${styles.voiceToggle} ${styles.voiceToggleActive}` : styles.voiceToggle}
            onClick={() => setVoiceOn((v) => !v)}
            aria-pressed={voiceOn}
          >
            {voiceOn ? "Voice replies: on" : "Voice replies: off"}
          </button>

          <div className={styles.groundedIn}>
            <span className={styles.groundedLabel}>This session is reading</span>
            <p className={styles.groundedText}>{buildContext()}</p>
          </div>

          <p className={styles.instrumentNote}>
            A wellness coach, not a clinician — anything that needs a real diagnosis gets a
            direct, plain referral instead of a guess.
          </p>
        </aside>
      </div>
    </div>
  );
}
