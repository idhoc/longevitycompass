"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { Orb } from "@/components/Orb";
import { RoutineCompass } from "@/components/RoutineCompass";
import { dateKeyOffset, type DomainDayReach } from "@/lib/domainReach";
import {
  EMPTY_PROFILE,
  GOAL_OPTIONS,
  SLEEP_HOURS_OPTIONS,
  SLEEP_COMPLAINT_OPTIONS,
  CAFFEINE_OPTIONS,
  ACTIVITY_LEVEL_OPTIONS,
  WORKOUT_STYLE_OPTIONS,
  NUTRITION_PATTERN_OPTIONS,
  DIETARY_OPTIONS,
  domainPlanFromProfile,
  type UserProfile,
  type DomainKey,
} from "@/lib/profile";
import styles from "./page.module.css";

const STEP_ORDER = [
  "welcome",
  "goal",
  "age",
  "sleepHours",
  "sleepComplaints",
  "caffeine",
  "activity",
  "workoutStyle",
  "injuries",
  "nutritionPattern",
  "dietary",
  "stress",
  "tour",
  "action",
] as const;
type StepId = (typeof STEP_ORDER)[number];
const STEP_COUNT = STEP_ORDER.length;

const AGE_RANGES = ["18-29", "30-44", "45-59", "60+"] as const;

const ACTION_COPY: Record<
  DomainKey | "none",
  { title: string; body: string; cta: string; href: string }
> = {
  sleep: {
    title: "Let's start with last night",
    body: "One honest check-in on how you slept is all it takes to get going.",
    cta: "Log last night's sleep",
    href: "/recovery",
  },
  nutrition: {
    title: "Let's see what's actually on your plate",
    body: "Photograph your next meal instead of describing it — that's the whole first step.",
    cta: "Log a meal",
    href: "/nutrition",
  },
  fitness: {
    title: "Let's ease in",
    body: "A short, guided session — no equipment, no pressure to go hard.",
    cta: "Start a quick session",
    href: "/fitness",
  },
  mind: {
    title: "Let's take one mindful breath",
    body: "Follow the glow for a few seconds — in as it grows, out as it settles.",
    cta: "Continue to Home",
    href: "/home",
  },
  none: {
    title: "You're all set",
    body: "Explore at your own pace — every screen is ready when you are.",
    cta: "Go to Home",
    href: "/home",
  },
};

function questionForStep(id: StepId, draft: UserProfile): string {
  switch (id) {
    case "welcome":
      return `Hi${draft.name ? ` ${draft.name}` : ""} — I'm your coach here at Longevity Compass. I'll ask a few quick things about your goals, sleep, food, movement, and stress, and shape everything after this around your actual life instead of a generic plan. Takes a couple minutes, and you can skip to the app any time.`;
    case "goal":
      return "First — what matters most to you right now?";
    case "age":
      return "How old are you, roughly? It changes what I'll actually recommend, especially for movement.";
    case "sleepHours":
      return "How much sleep do you usually get a night?";
    case "sleepComplaints":
      return "What tends to get in the way of good sleep, if anything?";
    case "caffeine":
      return "How much caffeine do you usually have in a day?";
    case "activity":
      return "How would you describe your current activity level?";
    case "workoutStyle":
      return "And what kind of movement do you actually enjoy?";
    case "injuries":
      return "Anything I should work around — an old injury, a joint issue, anything like that? Fine to skip.";
    case "nutritionPattern":
      return "How would you describe how you eat day to day?";
    case "dietary":
      return "Any dietary restrictions I should keep in mind?";
    case "stress":
      return "Last one before I show you around — how's your stress level lately, 1 to 5?";
    case "tour":
      return "Here's the actual dashboard you'll land on — tap around, then let's get you started.";
    case "action": {
      const chosenGoal = draft.primaryGoals[0] ?? "none";
      const action = ACTION_COPY[chosenGoal];
      return draft.name ? `${action.title}, ${draft.name}.` : `${action.title}.`;
    }
    default:
      return "";
  }
}

function summaryForStep(id: StepId, draft: UserProfile): string | null {
  switch (id) {
    case "welcome":
      return draft.name ? `I'm ${draft.name}.` : null;
    case "goal": {
      const g = GOAL_OPTIONS.find((g) => g.key === draft.primaryGoals[0]);
      return g ? g.label : "Not sure yet.";
    }
    case "age":
      return draft.ageRange || "Prefer not to say.";
    case "sleepHours":
      return draft.sleepHours || SLEEP_HOURS_OPTIONS[2];
    case "sleepComplaints":
      return draft.sleepComplaints.length ? draft.sleepComplaints.join(", ") : "No real complaint.";
    case "caffeine":
      return draft.caffeineHabit || "None";
    case "activity":
      return ACTIVITY_LEVEL_OPTIONS.find((a) => a.key === draft.activityLevel)?.label ?? "Not sure yet.";
    case "workoutStyle":
      return draft.workoutStyle || "Not sure yet";
    case "injuries":
      return draft.injuries.trim() ? draft.injuries.trim() : "Nothing to work around.";
    case "nutritionPattern":
      return draft.nutritionPattern || "No real pattern";
    case "dietary":
      return draft.dietaryRestrictions.length ? draft.dietaryRestrictions.join(", ") : "No restrictions";
    case "stress":
      return `${draft.stressLevel} out of 5`;
    default:
      return null;
  }
}

function BloomMark() {
  const dots = Array.from({ length: 8 }, (_, i) => (i / 8) * 360);
  return (
    <div className={styles.bloomWrap} aria-hidden="true">
      {dots.map((angle, i) => (
        <motion.span
          key={i}
          className={styles.bloomDot}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
          animate={{
            x: Math.cos((angle * Math.PI) / 180) * 46,
            y: Math.sin((angle * Math.PI) / 180) * 46,
            opacity: 0.8,
            scale: 1,
          }}
          transition={{ duration: 1, delay: 0.1 + i * 0.04, ease: "easeOut" }}
        />
      ))}
      <motion.span
        className={styles.bloomMark}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        LC
      </motion.span>
    </div>
  );
}

const COMPASS_SIZE = 220;
const COMPASS_CENTER = COMPASS_SIZE / 2;
const COMPASS_RADIUS = 78;
const COMPASS_RING = 24;

function angleForGoalIndex(i: number) {
  return -90 + i * 90; // N, E, S, W — matches GOAL_OPTIONS order
}

/** The goal picker, reimagined as an actual compass — tap or drag
 * anywhere on the dial to point the needle at what matters most, instead
 * of picking from a grid of buttons. The four real buttons underneath
 * keep it fully reachable by keyboard and screen reader. */
function GoalCompass({ value, onChange }: { value: DomainKey | null; onChange: (key: DomainKey) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const activeIndex = GOAL_OPTIONS.findIndex((g) => g.key === value);
  const needleAngle = activeIndex >= 0 ? angleForGoalIndex(activeIndex) : -90;

  function selectFromPoint(clientX: number, clientY: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;
    let deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    const idx = Math.round(deg / 90) % 4;
    onChange(GOAL_OPTIONS[idx].key);
  }

  return (
    <div className={styles.compassWrap}>
      <svg
        ref={svgRef}
        width={COMPASS_SIZE}
        height={COMPASS_SIZE}
        viewBox={`0 0 ${COMPASS_SIZE} ${COMPASS_SIZE}`}
        className={styles.compassSvg}
        aria-hidden="true"
        onPointerDown={(e) => {
          setDragging(true);
          e.currentTarget.setPointerCapture(e.pointerId);
          selectFromPoint(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (dragging) selectFromPoint(e.clientX, e.clientY);
        }}
        onPointerUp={() => setDragging(false)}
      >
        <circle cx={COMPASS_CENTER} cy={COMPASS_CENTER} r={COMPASS_RADIUS + COMPASS_RING} fill="var(--paper-raised)" stroke="var(--line-strong)" strokeWidth={2} />
        <circle cx={COMPASS_CENTER} cy={COMPASS_CENTER} r={COMPASS_RADIUS - 10} fill="none" stroke="var(--line)" strokeDasharray="2 6" />
        <line
          x1={COMPASS_CENTER}
          y1={COMPASS_CENTER}
          x2={COMPASS_CENTER + COMPASS_RADIUS * Math.cos((needleAngle * Math.PI) / 180)}
          y2={COMPASS_CENTER + COMPASS_RADIUS * Math.sin((needleAngle * Math.PI) / 180)}
          stroke="var(--signal)"
          strokeWidth={3}
          strokeLinecap="round"
          style={{ transition: dragging ? "none" : "all 0.4s cubic-bezier(0.16,1,0.3,1)" }}
        />
        <circle cx={COMPASS_CENTER} cy={COMPASS_CENTER} r={5} fill="var(--ink)" />
        {GOAL_OPTIONS.map((g, i) => {
          const a = angleForGoalIndex(i);
          const x = COMPASS_CENTER + (COMPASS_RADIUS + COMPASS_RING) * Math.cos((a * Math.PI) / 180);
          const y = COMPASS_CENTER + (COMPASS_RADIUS + COMPASS_RING) * Math.sin((a * Math.PI) / 180);
          return (
            <g key={g.key} transform={`translate(${x} ${y})`}>
              <circle r={20} fill={value === g.key ? "var(--signal)" : "var(--paper)"} stroke="var(--line-strong)" strokeWidth={1.5} />
              <text textAnchor="middle" dominantBaseline="central" fontSize="18">
                {g.icon}
              </text>
            </g>
          );
        })}
      </svg>

      <div className={styles.compassButtons} role="radiogroup" aria-label="Primary goal">
        {GOAL_OPTIONS.map((g) => (
          <button
            key={g.key}
            type="button"
            role="radio"
            aria-checked={value === g.key}
            className={value === g.key ? `${styles.compassButton} ${styles.compassButtonActive}` : styles.compassButton}
            onClick={() => onChange(g.key)}
          >
            <span aria-hidden="true">{g.icon}</span> {g.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface Bubble {
  who: "coach" | "you";
  text: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [, setProfile] = useLocalStorageState<UserProfile | null>("lc_profile_v1", null);
  const [, setSkipped] = useLocalStorageState<boolean>("lc_onboarding_skipped_v1", false);
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<UserProfile>(EMPTY_PROFILE);
  const [openHotspot, setOpenHotspot] = useState<"compass" | "tiles" | null>(null);
  const [transcript, setTranscript] = useState<Bubble[]>([{ who: "coach", text: questionForStep("welcome", EMPTY_PROFILE) }]);
  const [reflecting, setReflecting] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript, reflecting]);

  const stepId = STEP_ORDER[stepIndex];

  async function advance() {
    const summary = summaryForStep(stepId, draft);
    if (summary) setTranscript((t) => [...t, { who: "you", text: summary }]);

    const nextIndex = stepIndex + 1;

    if (summary) {
      setReflecting(true);
      try {
        const res = await fetch("/api/onboarding-reflect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: questionForStep(stepId, draft), answer: summary, name: draft.name }),
        });
        const data = await res.json();
        if (data?.message) setTranscript((t) => [...t, { who: "coach", text: data.message }]);
      } catch {
        // the reflection is a nice-to-have, not required for the flow to continue
      } finally {
        setReflecting(false);
      }
    }

    if (nextIndex < STEP_COUNT) {
      setTranscript((t) => [...t, { who: "coach", text: questionForStep(STEP_ORDER[nextIndex], draft) }]);
    }
    setStepIndex(nextIndex);
  }

  function skip() {
    setSkipped(true);
    router.push("/home");
  }

  function chooseGoal(key: DomainKey) {
    setDraft((d) => ({ ...d, primaryGoals: [key] }));
  }

  function toggleMulti(field: "sleepComplaints" | "dietaryRestrictions", value: string) {
    setDraft((d) => {
      const list = d[field];
      return { ...d, [field]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    });
  }

  function finishAndGo(href: string) {
    setProfile({ ...draft, disclaimerAcknowledged: true, completedAt: new Date().toISOString() });
    router.push(href);
  }

  const chosenGoal: DomainKey | "none" = draft.primaryGoals.length > 0 ? draft.primaryGoals[0] : "none";
  const action = ACTION_COPY[chosenGoal];
  const goalLabel = GOAL_OPTIONS.find((g) => g.key === chosenGoal)?.label;
  const plan = domainPlanFromProfile(draft);
  const sleepIndex = (SLEEP_HOURS_OPTIONS as readonly string[]).indexOf(draft.sleepHours);
  const previewDays: DomainDayReach[] = Array.from({ length: 7 }, (_, i) => ({
    date: dateKeyOffset(6 - i),
    sleep: 0,
    nutrition: 0,
    fitness: 0,
    mind: 0,
  }));

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <span className={styles.mark}>Longevity Compass</span>
        <button type="button" className={styles.skip} onClick={skip}>
          Skip for now
        </button>
      </div>

      <span className={styles.srOnly} role="status">
        Step {stepIndex + 1} of {STEP_COUNT}
      </span>

      <div className={styles.transcript} ref={logRef} aria-live="polite">
        {stepIndex === 0 && <BloomMark />}
        {transcript.map((b, i) => (
          <motion.div
            key={i}
            className={b.who === "coach" ? styles.bubbleCoach : styles.bubbleYou}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {b.text}
          </motion.div>
        ))}
        {reflecting && (
          <div className={styles.typing}>
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      <div className={styles.composer}>
        {stepId === "welcome" && (
          <div className={styles.welcomeComposer}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="ob-name">
                What should we call you? (optional)
              </label>
              <input
                id="ob-name"
                className={styles.input}
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="First name"
                autoComplete="given-name"
              />
            </div>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBig}`} onClick={advance}>
              Let&apos;s begin
            </button>
            <p className={styles.fineprint}>
              This app offers friendly coaching, not medical advice — it&apos;ll always say so
              plainly if something needs a real doctor.
            </p>
          </div>
        )}

        {stepId === "goal" && (
          <>
            <GoalCompass value={draft.primaryGoals[0] ?? null} onChange={chooseGoal} />
            {draft.primaryGoals[0] && (
              <p className={styles.compassHint}>{GOAL_OPTIONS.find((g) => g.key === draft.primaryGoals[0])?.hint}</p>
            )}
            <div className={styles.footer}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={advance}
                disabled={draft.primaryGoals.length === 0 || reflecting}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {stepId === "age" && (
          <>
            <div className={styles.chipRow}>
              {AGE_RANGES.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={draft.ageRange === a ? `${styles.swipeCard} ${styles.swipeCardActive}` : styles.swipeCard}
                  onClick={() => setDraft((d) => ({ ...d, ageRange: a }))}
                  aria-pressed={draft.ageRange === a}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className={styles.footer}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={advance}
                disabled={!draft.ageRange || reflecting}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {stepId === "sleepHours" && (
          <>
            <input
              type="range"
              min={0}
              max={SLEEP_HOURS_OPTIONS.length - 1}
              step={1}
              value={sleepIndex === -1 ? 2 : sleepIndex}
              onChange={(e) => setDraft((d) => ({ ...d, sleepHours: SLEEP_HOURS_OPTIONS[Number(e.target.value)] }))}
              className={styles.slider}
              aria-label="How much sleep do you usually get"
            />
            <div className={styles.sliderLabels} aria-hidden="true">
              {SLEEP_HOURS_OPTIONS.map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
            <p className={styles.sliderValue}>{draft.sleepHours || SLEEP_HOURS_OPTIONS[2]}</p>
            <div className={styles.footer}>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={advance} disabled={reflecting}>
                Continue
              </button>
            </div>
          </>
        )}

        {stepId === "sleepComplaints" && (
          <>
            <div className={styles.chipRow}>
              {SLEEP_COMPLAINT_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={draft.sleepComplaints.includes(c) ? `${styles.swipeCard} ${styles.swipeCardActive}` : styles.swipeCard}
                  onClick={() => toggleMulti("sleepComplaints", c)}
                  aria-pressed={draft.sleepComplaints.includes(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className={styles.footer}>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={advance} disabled={reflecting}>
                Continue
              </button>
            </div>
          </>
        )}

        {stepId === "caffeine" && (
          <>
            <div className={styles.chipRow}>
              {CAFFEINE_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={draft.caffeineHabit === c ? `${styles.swipeCard} ${styles.swipeCardActive}` : styles.swipeCard}
                  onClick={() => setDraft((d) => ({ ...d, caffeineHabit: c }))}
                  aria-pressed={draft.caffeineHabit === c}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className={styles.footer}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={advance}
                disabled={!draft.caffeineHabit || reflecting}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {stepId === "activity" && (
          <>
            <div className={styles.chipRow}>
              {ACTIVITY_LEVEL_OPTIONS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  className={draft.activityLevel === a.key ? `${styles.swipeCard} ${styles.swipeCardActive}` : styles.swipeCard}
                  onClick={() => setDraft((d) => ({ ...d, activityLevel: a.key }))}
                  aria-pressed={draft.activityLevel === a.key}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <div className={styles.footer}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={advance}
                disabled={!draft.activityLevel || reflecting}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {stepId === "workoutStyle" && (
          <>
            <div className={styles.swipeStrip}>
              {WORKOUT_STYLE_OPTIONS.map((w) => (
                <button
                  key={w}
                  type="button"
                  className={draft.workoutStyle === w ? `${styles.swipeCard} ${styles.swipeCardActive}` : styles.swipeCard}
                  onClick={() => setDraft((d) => ({ ...d, workoutStyle: w }))}
                  aria-pressed={draft.workoutStyle === w}
                >
                  {w}
                </button>
              ))}
            </div>
            <p className={styles.swipeHint}>Swipe to see all options →</p>
            <div className={styles.footer}>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={advance} disabled={reflecting}>
                Continue
              </button>
            </div>
          </>
        )}

        {stepId === "injuries" && (
          <>
            <input
              className={styles.input}
              value={draft.injuries}
              onChange={(e) => setDraft((d) => ({ ...d, injuries: e.target.value }))}
              placeholder="e.g. bad left knee — or leave this blank"
            />
            <div className={styles.footer}>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={advance} disabled={reflecting}>
                Continue
              </button>
            </div>
          </>
        )}

        {stepId === "nutritionPattern" && (
          <>
            <div className={styles.chipRow}>
              {NUTRITION_PATTERN_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={draft.nutritionPattern === n ? `${styles.swipeCard} ${styles.swipeCardActive}` : styles.swipeCard}
                  onClick={() => setDraft((d) => ({ ...d, nutritionPattern: n }))}
                  aria-pressed={draft.nutritionPattern === n}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className={styles.footer}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={advance}
                disabled={!draft.nutritionPattern || reflecting}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {stepId === "dietary" && (
          <>
            <div className={styles.chipRow}>
              {DIETARY_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={draft.dietaryRestrictions.includes(d) ? `${styles.swipeCard} ${styles.swipeCardActive}` : styles.swipeCard}
                  onClick={() => toggleMulti("dietaryRestrictions", d)}
                  aria-pressed={draft.dietaryRestrictions.includes(d)}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className={styles.footer}>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={advance} disabled={reflecting}>
                Continue
              </button>
            </div>
          </>
        )}

        {stepId === "stress" && (
          <>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={draft.stressLevel}
              onChange={(e) => setDraft((d) => ({ ...d, stressLevel: Number(e.target.value) }))}
              className={styles.slider}
              aria-label="Stress level, 1 to 5"
            />
            <div className={styles.sliderLabels} aria-hidden="true">
              <span>Calm</span>
              <span>High</span>
            </div>
            <p className={styles.sliderValue}>{draft.stressLevel} / 5</p>
            <div className={styles.footer}>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={advance} disabled={reflecting}>
                Continue
              </button>
            </div>
          </>
        )}

        {stepId === "tour" && (
          <>
            <div className={styles.tourPreview}>
              <button
                type="button"
                className={styles.tourHotspot}
                onClick={() => setOpenHotspot((h) => (h === "compass" ? null : "compass"))}
                aria-expanded={openHotspot === "compass"}
              >
                <RoutineCompass days={previewDays} centerLabel="This week" centerValue="—" />
              </button>
              {openHotspot === "compass" && (
                <p className={styles.tourCallout}>
                  Every ring is a domain — sleep, nutrition, fitness, mind. Every wedge is a day.
                  Log something and it fills in for real; today always sits on top.
                </p>
              )}

              <div className={styles.tourTileRow} role="group" aria-label="Domains">
                {(["nutrition", "fitness", "mind"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={styles.tourHotspotTile}
                    style={{ borderColor: `var(--${d})` }}
                    onClick={() => setOpenHotspot((h) => (h === "tiles" ? null : "tiles"))}
                    aria-expanded={openHotspot === "tiles"}
                  >
                    {d === "nutrition" ? "Nutrition" : d === "fitness" ? "Fitness" : "Mind"}
                  </button>
                ))}
              </div>
              {openHotspot === "tiles" && (
                <p className={styles.tourCallout}>
                  Tap any domain on Home to log something or dig in — guided workouts, meal
                  photos, guided meditation, sleep tracking, all one tap deep.
                </p>
              )}
            </div>
            <div className={styles.footer}>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={advance} disabled={reflecting}>
                Continue
              </button>
            </div>
          </>
        )}

        {stepId === "action" && (
          <div className={styles.actionStep}>
            {chosenGoal === "mind" ? (
              <div className={styles.orbMoment}>
                <Orb state="idle" size={140} color="var(--mind)" />
              </div>
            ) : (
              <div className={styles.doneIcon}>✓</div>
            )}
            {goalLabel && chosenGoal !== "none" && <p className={styles.planLine}>{plan[chosenGoal as DomainKey]}</p>}
            <p className={styles.subtitle}>{action.body}</p>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBig}`}
              onClick={() => finishAndGo(action.href)}
            >
              {action.cta}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
