"use client";

import { useRef, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { Waveform, type VoiceState } from "@/components/Waveform";
import styles from "./page.module.css";

type Entry = { who: "you" | "coach"; text: string; time: string };

const OPENING: Entry[] = [
  {
    who: "coach",
    text: "Morning. Sleep logged at 6.1 hours last night, a bit under your 7.5h target. What's actually keeping you up?",
    time: "07:12",
  },
  {
    who: "you",
    text: "Work stress mostly, and I've been having coffee kind of late.",
    time: "07:13",
  },
  {
    who: "coach",
    text: "Caffeine has roughly a 5-6 hour half-life for most people, so a 3pm coffee is still about a quarter-dose in your system at 9pm. Try moving your last cup to before noon this week and see if the 6.1h moves. If sleep stays broken after two weeks of that, it's worth a word with your doctor, not another week of guessing.",
    time: "07:13",
  },
];

// A handful of topical, scope-respecting sample replies so the composer
// feels alive without wiring a real model in this concept build.
function sampleReply(input: string): string {
  const q = input.toLowerCase();
  if (q.includes("creatine")) {
    return "Creatine monohydrate has the deepest evidence base of any supplement for strength and lean mass, roughly 3-5g daily, no loading phase required. It's not something I'd frame as longevity-critical on its own, more a reasonable add if you're already training. If you're on any kidney medication, check with your doctor first, that's outside what I can weigh in on.";
  }
  if (q.includes("protein")) {
    return "Most research on healthy adults over 40 points to 1.2-1.6g of protein per kg of bodyweight for preserving muscle, higher than the general 0.8g RDA. Spread across meals matters about as much as the daily total, since muscle protein synthesis responds to each dose.";
  }
  if (q.includes("sleep")) {
    return "Your logged average this week is 6.4h. The single highest-leverage change in the research isn't a supplement, it's consistent wake time, even on weekends. Circadian regulation responds more to when you wake than when you fall asleep.";
  }
  return "That's a fair question and I don't have a source-backed answer for it in front of me right now, so I'd rather say that plainly than guess. Ask me about sleep, protein, or creatine and I can point to something specific.";
}

function timeNow() {
  return new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function CoachPage() {
  const [entries, setEntries] = useState<Entry[]>(OPENING);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [manualState, setManualState] = useState<VoiceState | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);

  function clearTimers() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setManualState(null);
    setEntries((e) => [...e, { who: "you", text: trimmed, time: timeNow() }]);
    setDraft("");
    setBusy(true);
    setVoiceState("thinking");

    timers.current.push(
      window.setTimeout(() => {
        setVoiceState("speaking");
        const reply = sampleReply(trimmed);
        setEntries((e) => [...e, { who: "coach", text: reply, time: timeNow() }]);
        timers.current.push(
          window.setTimeout(() => {
            setVoiceState("idle");
            setBusy(false);
          }, 1600)
        );
      }, 900)
    );
  }

  function previewState(s: VoiceState) {
    clearTimers();
    setBusy(false);
    setManualState(s);
    setVoiceState(s);
  }

  const displayState = manualState ?? voiceState;

  return (
    <div className={styles.page}>
      <SiteNav active="/coach" />
      <div className={styles.body}>
        <div className={styles.transcript}>
          <div className={styles.log}>
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
                <p className={styles.entryText}>{entry.text}</p>
              </div>
            ))}
          </div>
          <form
            className={styles.composer}
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <input
              className={styles.input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about sleep, protein, creatine…"
              disabled={busy}
            />
            <button type="submit" className={styles.sendButton} disabled={busy || !draft.trim()}>
              Send
            </button>
          </form>
        </div>

        <aside className={styles.instrument}>
          <div className={styles.instrumentTop}>
            <span className="eyebrow">Signal</span>
            <span className={styles.stateLabel}>{displayState}</span>
          </div>
          <Waveform state={displayState} className={styles.waveform} />
          <div className={styles.stateButtons}>
            {(["idle", "listening", "thinking", "speaking"] as VoiceState[]).map((s) => (
              <button
                key={s}
                type="button"
                className={
                  displayState === s
                    ? `${styles.stateButton} ${styles.stateButtonActive}`
                    : styles.stateButton
                }
                onClick={() => previewState(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <p className={styles.instrumentNote}>
            A waveform reads as an honest instrument for voice — an amplitude signal, not a
            decorative sphere. These four buttons preview each state for this sample; in the
            shipped app they reflect real mic input and TTS playback.
          </p>
        </aside>
      </div>
    </div>
  );
}
